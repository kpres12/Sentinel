"""
Unit tests for fire spread modeling algorithms.
"""

import pytest
import numpy as np
from packages.algorithms.src.spread_modeling import (
    FireSpreadEngine,
    SpreadParameters,
    SpreadResult
)


class TestFireSpreadEngine:
    """Test cases for fire spread engine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.engine = FireSpreadEngine()
        
        # Create test spread parameters
        self.spread_params = SpreadParameters(
            ignition_points=[(40.0, -120.0)],  # Single ignition point
            wind_speed=10.0,  # m/s
            wind_direction=270.0,  # West wind
            temperature=30.0,  # Celsius
            humidity=30.0,  # %
            fuel_moisture=0.2,  # 0-1
            fuel_model=4,  # Chaparral
            simulation_hours=12,
            time_step_minutes=15,
            monte_carlo_runs=10
        )
    
    def test_spread_simulation_basic(self):
        """Test basic spread simulation."""
        result = self.engine.simulate_spread(self.spread_params)
        
        assert isinstance(result, SpreadResult)
        assert result.total_area_hectares >= 0
        assert result.max_spread_rate_mph >= 0
        assert 0 <= result.confidence <= 1
        assert len(result.isochrones) > 0
        assert len(result.perimeter) > 0
    
    def test_spread_simulation_with_multiple_ignition_points(self):
        """Test spread simulation with multiple ignition points."""
        multi_ignition_params = SpreadParameters(
            ignition_points=[(40.0, -120.0), (40.1, -119.9), (39.9, -120.1)],
            wind_speed=10.0,
            wind_direction=270.0,
            temperature=30.0,
            humidity=30.0,
            fuel_moisture=0.2,
            fuel_model=4,
            simulation_hours=12,
            time_step_minutes=15,
            monte_carlo_runs=10
        )
        
        result = self.engine.simulate_spread(multi_ignition_params)
        
        assert isinstance(result, SpreadResult)
        assert result.total_area_hectares >= 0
        assert len(result.perimeter) > 0
    
    def test_spread_rate_calculation(self):
        """Test spread rate calculation."""
        lat, lon = 40.0, -120.0
        time_minutes = 0
        
        spread_rate = self.engine._calculate_spread_rate(
            lat, lon, self.spread_params, time_minutes
        )
        
        assert spread_rate >= 0
        assert isinstance(spread_rate, float)
    
    def test_wind_factor_calculation(self):
        """Test wind factor calculation."""
        wind_factor = self.engine._calculate_wind_factor(
            wind_speed=10.0,
            wind_direction=270.0,
            slope=15.0,
            aspect=180.0
        )
        
        assert wind_factor > 0
        assert isinstance(wind_factor, float)
    
    def test_slope_factor_calculation(self):
        """Test slope factor calculation."""
        slope_factor = self.engine._calculate_slope_factor(
            slope=15.0,
            aspect=180.0,
            wind_direction=270.0
        )
        
        assert slope_factor > 0
        assert isinstance(slope_factor, float)
        
        # Steeper slopes should generally increase spread rate
        steeper_slope_factor = self.engine._calculate_slope_factor(
            slope=30.0,
            aspect=180.0,
            wind_direction=270.0
        )
        assert steeper_slope_factor >= slope_factor
    
    def test_moisture_factor_calculation(self):
        """Test moisture factor calculation."""
        moisture_factor = self.engine._calculate_moisture_factor(
            fuel_moisture=0.2,
            humidity=30.0
        )
        
        assert 0 <= moisture_factor <= 1
        assert isinstance(moisture_factor, float)
        
        # Higher moisture should reduce spread rate
        higher_moisture_factor = self.engine._calculate_moisture_factor(
            fuel_moisture=0.8,
            humidity=80.0
        )
        assert higher_moisture_factor < moisture_factor
    
    def test_temperature_factor_calculation(self):
        """Test temperature factor calculation."""
        temp_factor = self.engine._calculate_temperature_factor(30.0)
        
        assert temp_factor > 0
        assert isinstance(temp_factor, float)
        
        # Higher temperatures should increase spread rate
        higher_temp_factor = self.engine._calculate_temperature_factor(40.0)
        assert higher_temp_factor > temp_factor
        
        # Freezing temperatures should reduce spread rate
        freezing_temp_factor = self.engine._calculate_temperature_factor(-5.0)
        assert freezing_temp_factor < temp_factor
    
    def test_spread_probability_calculation(self):
        """Test spread probability calculation."""
        lat, lon = 40.0, -120.0
        grid_x, grid_y = 10, 10
        spread_rate = 5.0
        
        prob = self.engine._calculate_spread_probability(
            lat, lon, grid_x, grid_y, spread_rate, self.spread_params
        )
        
        assert 0 <= prob <= 1
        assert isinstance(prob, float)
    
    def test_bounds_calculation(self):
        """Test bounds calculation for points."""
        bounds = self.engine._calculate_bounds(40.0, -120.0, 10.0)  # 10km radius
        
        assert bounds[0] < bounds[2]  # west < east
        assert bounds[1] < bounds[3]  # south < north
        assert isinstance(bounds, tuple)
        assert len(bounds) == 4
    
    def test_fuel_models_initialization(self):
        """Test fuel models initialization."""
        fuel_models = self.engine.fuel_models
        
        assert isinstance(fuel_models, dict)
        assert len(fuel_models) == 13  # Anderson 13 fuel models
        
        # Check that all fuel models have required properties
        for model_id, model_data in fuel_models.items():
            assert isinstance(model_id, int)
            assert 1 <= model_id <= 13
            assert 'base_rate' in model_data
            assert 'description' in model_data
            assert model_data['base_rate'] > 0
    
    def test_spread_simulation_consistency(self):
        """Test that spread simulation results are consistent."""
        # Run multiple simulations with same parameters
        results = []
        for _ in range(3):
            result = self.engine.simulate_spread(self.spread_params)
            results.append(result)
        
        # All results should have similar properties
        areas = [r.total_area_hectares for r in results]
        rates = [r.max_spread_rate_mph for r in results]
        
        # Areas should be within reasonable range of each other
        area_std = np.std(areas)
        assert area_std < np.mean(areas) * 0.5  # Standard deviation < 50% of mean
        
        # Rates should be within reasonable range of each other
        rate_std = np.std(rates)
        assert rate_std < np.mean(rates) * 0.5  # Standard deviation < 50% of mean
    
    def test_isochrone_generation(self):
        """Test isochrone generation."""
        # Create mock perimeters for different time steps
        all_perimeters = [
            [(40.0, -120.0), (40.01, -120.0), (40.0, -119.99)],  # Early
            [(40.0, -120.0), (40.02, -120.0), (40.0, -119.98), (40.01, -119.99)],  # Later
        ]
        
        isochrones = self.engine._generate_isochrones(all_perimeters, self.spread_params)
        
        assert isinstance(isochrones, list)
        assert len(isochrones) > 0
        
        for isochrone in isochrones:
            assert 'hours_from_start' in isochrone
            assert 'geometry' in isochrone
            assert 'area_hectares' in isochrone
            assert 'perimeter_km' in isochrone
            assert isochrone['hours_from_start'] >= 0
            assert isochrone['area_hectares'] >= 0
            assert isochrone['perimeter_km'] >= 0
    
    def test_final_perimeter_calculation(self):
        """Test final perimeter calculation."""
        all_perimeters = [
            [(40.0, -120.0), (40.01, -120.0)],
            [(40.0, -120.0), (40.0, -119.99)],
            [(40.01, -120.0), (40.0, -119.99)]
        ]
        
        final_perimeter = self.engine._calculate_final_perimeter(all_perimeters)
        
        assert isinstance(final_perimeter, list)
        assert len(final_perimeter) > 0
        
        # All points should be tuples of (lat, lon)
        for point in final_perimeter:
            assert isinstance(point, tuple)
            assert len(point) == 2
            assert isinstance(point[0], (int, float))  # latitude
            assert isinstance(point[1], (int, float))  # longitude
    
    def test_confidence_calculation(self):
        """Test confidence calculation."""
        areas = [100.0, 105.0, 95.0, 102.0, 98.0]
        rates = [5.0, 5.2, 4.8, 5.1, 4.9]
        
        confidence = self.engine._calculate_confidence(areas, rates)
        
        assert 0 <= confidence <= 1
        assert isinstance(confidence, float)
        
        # More consistent data should have higher confidence
        consistent_areas = [100.0, 100.1, 99.9, 100.0, 100.1]
        consistent_rates = [5.0, 5.0, 5.0, 5.0, 5.0]
        
        consistent_confidence = self.engine._calculate_confidence(consistent_areas, consistent_rates)
        assert consistent_confidence > confidence
    
    def test_spread_simulation_with_different_conditions(self):
        """Test spread simulation with different environmental conditions."""
        # High wind conditions
        high_wind_params = SpreadParameters(
            ignition_points=[(40.0, -120.0)],
            wind_speed=25.0,  # Very high wind
            wind_direction=270.0,
            temperature=35.0,
            humidity=20.0,
            fuel_moisture=0.1,
            fuel_model=4,
            simulation_hours=12,
            time_step_minutes=15,
            monte_carlo_runs=10
        )
        
        high_wind_result = self.engine.simulate_spread(high_wind_params)
        
        # Low wind conditions
        low_wind_params = SpreadParameters(
            ignition_points=[(40.0, -120.0)],
            wind_speed=2.0,  # Low wind
            wind_direction=270.0,
            temperature=35.0,
            humidity=20.0,
            fuel_moisture=0.1,
            fuel_model=4,
            simulation_hours=12,
            time_step_minutes=15,
            monte_carlo_runs=10
        )
        
        low_wind_result = self.engine.simulate_spread(low_wind_params)
        
        # High wind should generally result in larger spread
        # (allowing for Monte Carlo variability)
        assert high_wind_result.total_area_hectares >= low_wind_result.total_area_hectares * 0.5
    
    def test_spread_simulation_edge_cases(self):
        """Test spread simulation with edge cases."""
        # Zero wind
        zero_wind_params = SpreadParameters(
            ignition_points=[(40.0, -120.0)],
            wind_speed=0.0,
            wind_direction=270.0,
            temperature=30.0,
            humidity=50.0,
            fuel_moisture=0.5,
            fuel_model=1,  # Short grass
            simulation_hours=6,
            time_step_minutes=30,
            monte_carlo_runs=5
        )
        
        result = self.engine.simulate_spread(zero_wind_params)
        assert isinstance(result, SpreadResult)
        assert result.total_area_hectares >= 0
        
        # Very high moisture
        high_moisture_params = SpreadParameters(
            ignition_points=[(40.0, -120.0)],
            wind_speed=10.0,
            wind_direction=270.0,
            temperature=30.0,
            humidity=90.0,
            fuel_moisture=0.9,
            fuel_model=1,
            simulation_hours=6,
            time_step_minutes=30,
            monte_carlo_runs=5
        )
        
        result = self.engine.simulate_spread(high_moisture_params)
        assert isinstance(result, SpreadResult)
        assert result.total_area_hectares >= 0
