"""
Fire spread modeling and prediction algorithms.
"""

import numpy as np
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass
import math
import random
from scipy.spatial.distance import cdist
from scipy.interpolate import griddata


@dataclass
class SpreadParameters:
    """Parameters for fire spread simulation."""
    ignition_points: List[Tuple[float, float]]  # (lat, lon)
    wind_speed: float  # m/s
    wind_direction: float  # degrees from north
    temperature: float  # Celsius
    humidity: float  # 0-100%
    fuel_moisture: float  # 0-1
    fuel_model: int  # Anderson 13 fuel model
    simulation_hours: int = 24
    time_step_minutes: int = 15
    monte_carlo_runs: int = 100


@dataclass
class SpreadResult:
    """Result of fire spread simulation."""
    simulation_id: str
    isochrones: List[Dict[str, Any]]  # Time contours
    perimeter: List[Tuple[float, float]]  # Final perimeter
    total_area_hectares: float
    max_spread_rate_mph: float
    confidence: float
    statistics: Dict[str, float]


class FireSpreadEngine:
    """Engine for fire spread modeling and prediction."""
    
    def __init__(self, terrain_data: Optional[Dict] = None):
        self.terrain_data = terrain_data or {}
        self.fuel_models = self._initialize_fuel_models()
    
    def simulate_spread(self, params: SpreadParameters) -> SpreadResult:
        """
        Simulate fire spread using Rothermel model with terrain and wind.
        
        Args:
            params: Spread simulation parameters
            
        Returns:
            Spread simulation result
        """
        # Run Monte Carlo simulations
        all_perimeters = []
        all_areas = []
        all_spread_rates = []
        
        for run in range(params.monte_carlo_runs):
            perimeter, area, max_rate = self._simulate_single_run(params)
            all_perimeters.append(perimeter)
            all_areas.append(area)
            all_spread_rates.append(max_rate)
        
        # Calculate statistics
        mean_area = np.mean(all_areas)
        std_area = np.std(all_areas)
        mean_spread_rate = np.mean(all_spread_rates)
        
        # Generate isochrones from all runs
        isochrones = self._generate_isochrones(all_perimeters, params)
        
        # Calculate final perimeter (union of all runs)
        final_perimeter = self._calculate_final_perimeter(all_perimeters)
        
        # Calculate confidence based on consistency
        confidence = self._calculate_confidence(all_areas, all_spread_rates)
        
        return SpreadResult(
            simulation_id=f"sim_{random.randint(1000, 9999)}",
            isochrones=isochrones,
            perimeter=final_perimeter,
            total_area_hectares=mean_area,
            max_spread_rate_mph=mean_spread_rate,
            confidence=confidence,
            statistics={
                "mean_area_hectares": mean_area,
                "std_area_hectares": std_area,
                "mean_spread_rate_mph": mean_spread_rate,
                "max_spread_rate_mph": max(all_spread_rates),
                "min_spread_rate_mph": min(all_spread_rates),
                "runs_completed": params.monte_carlo_runs
            }
        )
    
    def _simulate_single_run(self, params: SpreadParameters) -> Tuple[List[Tuple[float, float]], float, float]:
        """Simulate a single fire spread run."""
        # Initialize fire front
        fire_front = set(params.ignition_points)
        burned_cells = set(fire_front)
        
        # Convert to grid coordinates
        grid_size = 100  # meters
        bounds = self._calculate_bounds(params.ignition_points)
        grid_width = int((bounds[2] - bounds[0]) / grid_size) + 1
        grid_height = int((bounds[3] - bounds[1]) / grid_size) + 1
        
        # Initialize spread rates
        spread_rates = np.zeros((grid_height, grid_width))
        max_spread_rate = 0.0
        
        # Time steps
        time_steps = int(params.simulation_hours * 60 / params.time_step_minutes)
        
        for step in range(time_steps):
            new_fire_front = set()
            
            for lat, lon in fire_front:
                # Get grid coordinates
                grid_x = int((lon - bounds[0]) / grid_size)
                grid_y = int((lat - bounds[1]) / grid_size)
                
                if 0 <= grid_x < grid_width and 0 <= grid_y < grid_height:
                    # Calculate spread rate for this cell
                    spread_rate = self._calculate_spread_rate(
                        lat, lon, params, step * params.time_step_minutes
                    )
                    
                    spread_rates[grid_y, grid_x] = spread_rate
                    max_spread_rate = max(max_spread_rate, spread_rate)
                    
                    # Spread to neighboring cells
                    for dx in [-1, 0, 1]:
                        for dy in [-1, 0, 1]:
                            if dx == 0 and dy == 0:
                                continue
                            
                            new_x = grid_x + dx
                            new_y = grid_y + dy
                            
                            if (0 <= new_x < grid_width and 
                                0 <= new_y < grid_height and 
                                (new_x, new_y) not in burned_cells):
                                
                                # Calculate probability of spread
                                prob = self._calculate_spread_probability(
                                    lat, lon, new_x, new_y, spread_rate, params
                                )
                                
                                if random.random() < prob:
                                    new_lat = bounds[1] + new_y * grid_size
                                    new_lon = bounds[0] + new_x * grid_size
                                    new_fire_front.add((new_lat, new_lon))
                                    burned_cells.add((new_x, new_y))
            
            fire_front = new_fire_front
            
            if not fire_front:
                break
        
        # Convert burned cells back to lat/lon
        perimeter = []
        for grid_x, grid_y in burned_cells:
            lat = bounds[1] + grid_y * grid_size
            lon = bounds[0] + grid_x * grid_size
            perimeter.append((lat, lon))
        
        # Calculate area in hectares
        area_hectares = len(burned_cells) * (grid_size ** 2) / 10000
        
        return perimeter, area_hectares, max_spread_rate
    
    def _calculate_spread_rate(self, lat: float, lon: float, params: SpreadParameters, time_minutes: int) -> float:
        """Calculate spread rate using Rothermel model."""
        # Get terrain data
        slope, aspect = self._get_terrain_data(lat, lon)
        
        # Base spread rate from fuel model
        base_rate = self.fuel_models.get(params.fuel_model, {}).get('base_rate', 0.1)  # m/s
        
        # Wind effect
        wind_factor = self._calculate_wind_factor(
            params.wind_speed, params.wind_direction, slope, aspect
        )
        
        # Slope effect
        slope_factor = self._calculate_slope_factor(slope, aspect, params.wind_direction)
        
        # Moisture effect
        moisture_factor = self._calculate_moisture_factor(params.fuel_moisture, params.humidity)
        
        # Temperature effect
        temp_factor = self._calculate_temperature_factor(params.temperature)
        
        # Combine factors
        spread_rate = base_rate * wind_factor * slope_factor * moisture_factor * temp_factor
        
        # Convert to mph
        return spread_rate * 2.237
    
    def _calculate_wind_factor(self, wind_speed: float, wind_direction: float, 
                              slope: float, aspect: float) -> float:
        """Calculate wind effect on spread rate."""
        if wind_speed == 0:
            return 1.0
        
        # Wind direction relative to slope aspect
        wind_relative = wind_direction - aspect
        wind_relative = (wind_relative + 360) % 360
        
        # Wind speed factor
        speed_factor = 1 + (wind_speed / 10.0)  # Linear increase with wind
        
        # Wind direction factor (spread faster upslope with wind)
        if 0 <= wind_relative <= 180:
            direction_factor = 1 + (wind_relative / 180.0) * 0.5
        else:
            direction_factor = 1 - ((wind_relative - 180) / 180.0) * 0.3
        
        return speed_factor * direction_factor
    
    def _calculate_slope_factor(self, slope: float, aspect: float, wind_direction: float) -> float:
        """Calculate slope effect on spread rate."""
        if slope == 0:
            return 1.0
        
        # Slope increases spread rate
        slope_factor = 1 + (slope / 45.0) * 0.5  # Up to 50% increase at 45 degrees
        
        # Aspect relative to wind direction
        aspect_relative = abs(aspect - wind_direction)
        if aspect_relative > 180:
            aspect_relative = 360 - aspect_relative
        
        # Spread faster when wind and slope are aligned
        if aspect_relative < 90:
            alignment_factor = 1 + (90 - aspect_relative) / 90.0 * 0.3
        else:
            alignment_factor = 1.0
        
        return slope_factor * alignment_factor
    
    def _calculate_moisture_factor(self, fuel_moisture: float, humidity: float) -> float:
        """Calculate moisture effect on spread rate."""
        # Fuel moisture effect (inverse relationship)
        fuel_factor = 1 - fuel_moisture * 0.8  # Up to 80% reduction
        
        # Humidity effect (inverse relationship)
        humidity_factor = 1 - (humidity / 100.0) * 0.5  # Up to 50% reduction
        
        return max(0.1, fuel_factor * humidity_factor)
    
    def _calculate_temperature_factor(self, temperature: float) -> float:
        """Calculate temperature effect on spread rate."""
        if temperature < 0:
            return 0.1  # Very slow in freezing conditions
        elif temperature < 10:
            return 0.5  # Slow in cold conditions
        elif temperature < 30:
            return 1.0 + (temperature - 10) / 20.0 * 0.5  # Gradual increase
        else:
            return 1.5  # Fast in hot conditions
    
    def _calculate_spread_probability(self, lat: float, lon: float, grid_x: int, grid_y: int,
                                    spread_rate: float, params: SpreadParameters) -> float:
        """Calculate probability of fire spreading to a neighboring cell."""
        # Base probability from spread rate
        base_prob = min(1.0, spread_rate / 10.0)  # Normalize to 0-1
        
        # Distance factor (closer cells more likely)
        distance = math.sqrt(2) * 100  # Diagonal distance in meters
        distance_factor = 1.0 / (1.0 + distance / 1000.0)
        
        # Random factor for Monte Carlo
        random_factor = random.random()
        
        return base_prob * distance_factor * random_factor
    
    def _get_terrain_data(self, lat: float, lon: float) -> Tuple[float, float]:
        """Get terrain data for a location."""
        # In production, this would query actual terrain data
        # For now, return default values
        return 0.0, 0.0  # slope, aspect
    
    def _calculate_bounds(self, points: List[Tuple[float, float]]) -> Tuple[float, float, float, float]:
        """Calculate bounding box for points."""
        lats = [p[0] for p in points]
        lons = [p[1] for p in points]
        return min(lons), min(lats), max(lons), max(lats)
    
    def _generate_isochrones(self, all_perimeters: List[List[Tuple[float, float]]], 
                            params: SpreadParameters) -> List[Dict[str, Any]]:
        """Generate isochrones from multiple simulation runs."""
        isochrones = []
        
        # Create time intervals
        time_intervals = [6, 12, 18, 24]  # hours
        
        for hours in time_intervals:
            if hours > params.simulation_hours:
                continue
            
            # Find cells that burned within this time
            burned_cells = set()
            for perimeter in all_perimeters:
                # Simple approximation - in production would track burn times
                if len(perimeter) > 0:
                    burned_cells.update(perimeter)
            
            if burned_cells:
                isochrone = {
                    "hours_from_start": hours,
                    "geometry": list(burned_cells),
                    "area_hectares": len(burned_cells) * 0.01,  # Approximate
                    "perimeter_km": len(burned_cells) * 0.1  # Approximate
                }
                isochrones.append(isochrone)
        
        return isochrones
    
    def _calculate_final_perimeter(self, all_perimeters: List[List[Tuple[float, float]]]) -> List[Tuple[float, float]]:
        """Calculate final perimeter from all simulation runs."""
        if not all_perimeters:
            return []
        
        # Simple union of all perimeters
        all_points = set()
        for perimeter in all_perimeters:
            all_points.update(perimeter)
        
        return list(all_points)
    
    def _calculate_confidence(self, areas: List[float], spread_rates: List[float]) -> float:
        """Calculate confidence in simulation results."""
        if not areas or not spread_rates:
            return 0.0
        
        # Calculate coefficient of variation
        area_cv = np.std(areas) / np.mean(areas) if np.mean(areas) > 0 else 1.0
        rate_cv = np.std(spread_rates) / np.mean(spread_rates) if np.mean(spread_rates) > 0 else 1.0
        
        # Lower CV = higher confidence
        confidence = 1.0 - (area_cv + rate_cv) / 2.0
        return max(0.0, min(1.0, confidence))
    
    def _initialize_fuel_models(self) -> Dict[int, Dict[str, float]]:
        """Initialize Anderson 13 fuel model parameters."""
        return {
            1: {"base_rate": 0.1, "description": "Short grass"},
            2: {"base_rate": 0.2, "description": "Timber with grass"},
            3: {"base_rate": 0.3, "description": "Tall grass"},
            4: {"base_rate": 0.4, "description": "Chaparral"},
            5: {"base_rate": 0.5, "description": "Brush"},
            6: {"base_rate": 0.6, "description": "Dormant brush"},
            7: {"base_rate": 0.7, "description": "Southern rough"},
            8: {"base_rate": 0.8, "description": "Closed timber litter"},
            9: {"base_rate": 0.9, "description": "Hardwood litter"},
            10: {"base_rate": 0.8, "description": "Timber with litter"},
            11: {"base_rate": 0.6, "description": "Light logging slash"},
            12: {"base_rate": 0.7, "description": "Medium logging slash"},
            13: {"base_rate": 0.8, "description": "Heavy logging slash"}
        }
