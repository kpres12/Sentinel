"""
Bearing-only triangulation algorithms for smoke localization.
"""

import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass
from scipy.optimize import minimize
from scipy.spatial.distance import cdist
import math


@dataclass
class BearingObservation:
    """A bearing observation from a camera/device."""
    device_id: str
    latitude: float
    longitude: float
    altitude: float
    camera_heading: float  # degrees from north
    camera_pitch: float    # degrees from horizontal
    bearing: float         # degrees from north to target
    confidence: float      # 0-1 confidence in bearing
    detection_id: str


@dataclass
class TriangulationResult:
    """Result of triangulation calculation."""
    latitude: float
    longitude: float
    altitude: float
    confidence: float      # 0-1 overall confidence
    uncertainty_meters: float  # 95% confidence radius
    observation_ids: List[str]
    method: str
    quality_metrics: Dict[str, float]


class TriangulationEngine:
    """Engine for bearing-only triangulation."""
    
    def __init__(self, max_distance_km: float = 50.0):
        self.max_distance_km = max_distance_km
        self.earth_radius = 6371000  # meters
    
    def triangulate(self, observations: List[BearingObservation]) -> List[TriangulationResult]:
        """
        Triangulate smoke location from bearing observations.
        
        Args:
            observations: List of bearing observations
            
        Returns:
            List of triangulation results (may be multiple if RANSAC finds outliers)
        """
        if len(observations) < 2:
            return []
        
        # Filter observations by confidence and distance
        valid_obs = self._filter_observations(observations)
        if len(valid_obs) < 2:
            return []
        
        # Try different methods
        results = []
        
        # Method 1: Simple intersection
        simple_result = self._simple_intersection(valid_obs)
        if simple_result:
            results.append(simple_result)
        
        # Method 2: RANSAC for outlier rejection
        ransac_results = self._ransac_triangulation(valid_obs)
        results.extend(ransac_results)
        
        # Method 3: Least squares optimization
        ls_result = self._least_squares_triangulation(valid_obs)
        if ls_result:
            results.append(ls_result)
        
        # Return best result based on confidence
        if results:
            return [max(results, key=lambda r: r.confidence)]
        
        return []
    
    def _filter_observations(self, observations: List[BearingObservation]) -> List[BearingObservation]:
        """Filter observations by confidence and distance."""
        filtered = []
        
        for obs in observations:
            if obs.confidence < 0.3:  # Minimum confidence threshold
                continue
            
            # Check if observation is within reasonable distance
            if self._is_within_distance(obs):
                filtered.append(obs)
        
        return filtered
    
    def _is_within_distance(self, obs: BearingObservation) -> bool:
        """Check if observation is within maximum distance."""
        # Simple check - in production, would use actual terrain data
        return True
    
    def _simple_intersection(self, observations: List[BearingObservation]) -> Optional[TriangulationResult]:
        """Simple ray intersection method."""
        if len(observations) < 2:
            return None
        
        # Use first two observations for simple intersection
        obs1, obs2 = observations[0], observations[1]
        
        # Convert to Cartesian coordinates
        p1 = self._latlon_to_cartesian(obs1.latitude, obs1.longitude, obs1.altitude)
        p2 = self._latlon_to_cartesian(obs2.latitude, obs2.longitude, obs2.altitude)
        
        # Calculate direction vectors
        d1 = self._bearing_to_direction(obs1.bearing, obs1.camera_pitch)
        d2 = self._bearing_to_direction(obs2.bearing, obs2.camera_pitch)
        
        # Find intersection
        intersection = self._ray_intersection(p1, d1, p2, d2)
        
        if intersection is None:
            return None
        
        # Convert back to lat/lon
        lat, lon, alt = self._cartesian_to_latlon(intersection)
        
        # Calculate confidence based on angular spread and baseline
        confidence = self._calculate_confidence(observations[:2])
        
        return TriangulationResult(
            latitude=lat,
            longitude=lon,
            altitude=alt,
            confidence=confidence,
            uncertainty_meters=self._calculate_uncertainty(observations[:2]),
            observation_ids=[obs1.detection_id, obs2.detection_id],
            method="simple_intersection",
            quality_metrics={
                "angular_spread": self._calculate_angular_spread(observations[:2]),
                "baseline_distance": self._calculate_baseline_distance(obs1, obs2)
            }
        )
    
    def _ransac_triangulation(self, observations: List[BearingObservation]) -> List[TriangulationResult]:
        """RANSAC triangulation for outlier rejection."""
        if len(observations) < 3:
            return []
        
        best_result = None
        best_inliers = []
        best_score = 0
        
        # Try different combinations of observations
        for i in range(len(observations)):
            for j in range(i + 1, len(observations)):
                for k in range(j + 1, len(observations)):
                    subset = [observations[i], observations[j], observations[k]]
                    result = self._simple_intersection(subset)
                    
                    if result is None:
                        continue
                    
                    # Count inliers
                    inliers = self._count_inliers(result, observations)
                    score = len(inliers) * result.confidence
                    
                    if score > best_score:
                        best_score = score
                        best_result = result
                        best_inliers = inliers
        
        if best_result and len(best_inliers) >= 2:
            # Update result with all inliers
            best_result.observation_ids = [obs.detection_id for obs in best_inliers]
            best_result.confidence = self._calculate_confidence(best_inliers)
            best_result.uncertainty_meters = self._calculate_uncertainty(best_inliers)
            return [best_result]
        
        return []
    
    def _least_squares_triangulation(self, observations: List[BearingObservation]) -> Optional[TriangulationResult]:
        """Least squares optimization for triangulation."""
        if len(observations) < 2:
            return None
        
        # Initial guess from simple intersection
        initial_result = self._simple_intersection(observations[:2])
        if initial_result is None:
            return None
        
        # Objective function: sum of squared bearing errors
        def objective(params):
            lat, lon, alt = params
            total_error = 0
            
            for obs in observations:
                # Calculate expected bearing from observation point to target
                expected_bearing = self._calculate_bearing(
                    obs.latitude, obs.longitude, lat, lon
                )
                
                # Calculate error (handling angle wrapping)
                error = self._angle_difference(obs.bearing, expected_bearing)
                total_error += (error * obs.confidence) ** 2
            
            return total_error
        
        # Minimize objective function
        result = minimize(
            objective,
            [initial_result.latitude, initial_result.longitude, initial_result.altitude],
            method='BFGS'
        )
        
        if not result.success:
            return None
        
        lat, lon, alt = result.x
        
        # Calculate confidence
        confidence = self._calculate_confidence(observations)
        
        return TriangulationResult(
            latitude=lat,
            longitude=lon,
            altitude=alt,
            confidence=confidence,
            uncertainty_meters=self._calculate_uncertainty(observations),
            observation_ids=[obs.detection_id for obs in observations],
            method="least_squares",
            quality_metrics={
                "angular_spread": self._calculate_angular_spread(observations),
                "baseline_distance": self._calculate_baseline_distance(observations[0], observations[-1]),
                "residual_error": result.fun
            }
        )
    
    def _latlon_to_cartesian(self, lat: float, lon: float, alt: float) -> np.ndarray:
        """Convert lat/lon/alt to Cartesian coordinates."""
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        
        x = (self.earth_radius + alt) * math.cos(lat_rad) * math.cos(lon_rad)
        y = (self.earth_radius + alt) * math.cos(lat_rad) * math.sin(lon_rad)
        z = (self.earth_radius + alt) * math.sin(lat_rad)
        
        return np.array([x, y, z])
    
    def _cartesian_to_latlon(self, point: np.ndarray) -> Tuple[float, float, float]:
        """Convert Cartesian coordinates to lat/lon/alt."""
        x, y, z = point
        
        r = math.sqrt(x*x + y*y + z*z)
        lat = math.degrees(math.asin(z / r))
        lon = math.degrees(math.atan2(y, x))
        alt = r - self.earth_radius
        
        return lat, lon, alt
    
    def _bearing_to_direction(self, bearing: float, pitch: float) -> np.ndarray:
        """Convert bearing and pitch to 3D direction vector."""
        bearing_rad = math.radians(bearing)
        pitch_rad = math.radians(pitch)
        
        # North = 0°, East = 90°
        x = math.sin(bearing_rad) * math.cos(pitch_rad)
        y = math.cos(bearing_rad) * math.cos(pitch_rad)
        z = math.sin(pitch_rad)
        
        return np.array([x, y, z])
    
    def _ray_intersection(self, p1: np.ndarray, d1: np.ndarray, 
                         p2: np.ndarray, d2: np.ndarray) -> Optional[np.ndarray]:
        """Find intersection of two rays in 3D space."""
        # Calculate the vector between the two points
        w0 = p1 - p2
        
        # Calculate dot products
        a = np.dot(d1, d1)
        b = np.dot(d1, d2)
        c = np.dot(d2, d2)
        d = np.dot(d1, w0)
        e = np.dot(d2, w0)
        
        # Calculate denominator
        denom = a * c - b * b
        
        if abs(denom) < 1e-10:
            return None  # Rays are parallel
        
        # Calculate parameters
        t1 = (b * e - c * d) / denom
        t2 = (a * e - b * d) / denom
        
        # Calculate intersection points
        intersection1 = p1 + t1 * d1
        intersection2 = p2 + t2 * d2
        
        # Check if they're close enough (within 1km)
        distance = np.linalg.norm(intersection1 - intersection2)
        if distance > 1000:
            return None
        
        # Return average of intersection points
        return (intersection1 + intersection2) / 2
    
    def _calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate bearing between two points."""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        y = math.sin(delta_lon) * math.cos(lat2_rad)
        x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon)
        
        bearing = math.degrees(math.atan2(y, x))
        if bearing < 0:
            bearing += 360
        
        return bearing
    
    def _angle_difference(self, angle1: float, angle2: float) -> float:
        """Calculate difference between two angles, handling wrapping."""
        diff = angle1 - angle2
        while diff > 180:
            diff -= 360
        while diff < -180:
            diff += 360
        return abs(diff)
    
    def _calculate_confidence(self, observations: List[BearingObservation]) -> float:
        """Calculate overall confidence from observations."""
        if not observations:
            return 0.0
        
        # Base confidence from individual observations
        base_confidence = np.mean([obs.confidence for obs in observations])
        
        # Angular spread factor (more spread = higher confidence)
        angular_spread = self._calculate_angular_spread(observations)
        spread_factor = min(1.0, angular_spread / 90.0)  # Normalize to 0-1
        
        # Baseline distance factor (longer baseline = higher confidence)
        if len(observations) >= 2:
            baseline = self._calculate_baseline_distance(observations[0], observations[-1])
            baseline_factor = min(1.0, baseline / 10000.0)  # Normalize to 0-1
        else:
            baseline_factor = 0.5
        
        # Number of observations factor
        count_factor = min(1.0, len(observations) / 4.0)  # Normalize to 0-1
        
        # Combine factors
        confidence = base_confidence * 0.4 + spread_factor * 0.3 + baseline_factor * 0.2 + count_factor * 0.1
        
        return min(1.0, max(0.0, confidence))
    
    def _calculate_uncertainty(self, observations: List[BearingObservation]) -> float:
        """Calculate uncertainty in meters."""
        if len(observations) < 2:
            return 1000.0  # Default uncertainty
        
        # Base uncertainty from angular spread
        angular_spread = self._calculate_angular_spread(observations)
        if angular_spread < 30:
            return 2000.0  # High uncertainty for small angular spread
        elif angular_spread < 60:
            return 1000.0
        else:
            return 500.0
    
    def _calculate_angular_spread(self, observations: List[BearingObservation]) -> float:
        """Calculate angular spread between observations."""
        if len(observations) < 2:
            return 0.0
        
        bearings = [obs.bearing for obs in observations]
        bearings.sort()
        
        # Calculate gaps between consecutive bearings
        gaps = []
        for i in range(len(bearings)):
            next_i = (i + 1) % len(bearings)
            gap = bearings[next_i] - bearings[i]
            if gap < 0:
                gap += 360
            gaps.append(gap)
        
        return max(gaps)
    
    def _calculate_baseline_distance(self, obs1: BearingObservation, obs2: BearingObservation) -> float:
        """Calculate baseline distance between two observations."""
        lat1_rad = math.radians(obs1.latitude)
        lat2_rad = math.radians(obs2.latitude)
        delta_lat = math.radians(obs2.latitude - obs1.latitude)
        delta_lon = math.radians(obs2.longitude - obs1.longitude)
        
        a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return self.earth_radius * c
    
    def _count_inliers(self, result: TriangulationResult, observations: List[BearingObservation]) -> List[BearingObservation]:
        """Count inliers for RANSAC."""
        inliers = []
        threshold = 5.0  # degrees
        
        for obs in observations:
            expected_bearing = self._calculate_bearing(
                obs.latitude, obs.longitude, result.latitude, result.longitude
            )
            error = self._angle_difference(obs.bearing, expected_bearing)
            
            if error < threshold:
                inliers.append(obs)
        
        return inliers
