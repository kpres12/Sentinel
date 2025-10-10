"""
Unit tests for triangulation algorithms.
"""

import pytest
import numpy as np
from packages.algorithms.src.triangulation import (
    TriangulationEngine,
    BearingObservation,
    TriangulationResult
)


class TestTriangulationEngine:
    """Test cases for triangulation engine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.engine = TriangulationEngine()
        
        # Create test observations
        self.observations = [
            BearingObservation(
                device_id="camera_1",
                latitude=40.0,
                longitude=-120.0,
                altitude=1000.0,
                camera_heading=0.0,
                camera_pitch=0.0,
                bearing=45.0,
                confidence=0.9,
                detection_id="det_1"
            ),
            BearingObservation(
                device_id="camera_2",
                latitude=40.1,
                longitude=-119.9,
                altitude=1100.0,
                camera_heading=90.0,
                camera_pitch=0.0,
                bearing=315.0,
                confidence=0.8,
                detection_id="det_2"
            ),
            BearingObservation(
                device_id="camera_3",
                latitude=39.9,
                longitude=-119.8,
                altitude=950.0,
                camera_heading=180.0,
                camera_pitch=0.0,
                bearing=225.0,
                confidence=0.85,
                detection_id="det_3"
            )
        ]
    
    def test_triangulate_sufficient_observations(self):
        """Test triangulation with sufficient observations."""
        results = self.engine.triangulate(self.observations)
        
        assert len(results) > 0
        assert isinstance(results[0], TriangulationResult)
        assert 0 <= results[0].confidence <= 1
        assert results[0].uncertainty_meters > 0
    
    def test_triangulate_insufficient_observations(self):
        """Test triangulation with insufficient observations."""
        single_obs = [self.observations[0]]
        results = self.engine.triangulate(single_obs)
        
        assert len(results) == 0
    
    def test_triangulate_low_confidence_filtering(self):
        """Test that low confidence observations are filtered out."""
        low_confidence_obs = [
            BearingObservation(
                device_id="camera_1",
                latitude=40.0,
                longitude=-120.0,
                altitude=1000.0,
                camera_heading=0.0,
                camera_pitch=0.0,
                bearing=45.0,
                confidence=0.1,  # Low confidence
                detection_id="det_1"
            ),
            BearingObservation(
                device_id="camera_2",
                latitude=40.1,
                longitude=-119.9,
                altitude=1100.0,
                camera_heading=90.0,
                camera_pitch=0.0,
                bearing=315.0,
                confidence=0.2,  # Low confidence
                detection_id="det_2"
            )
        ]
        
        results = self.engine.triangulate(low_confidence_obs)
        assert len(results) == 0
    
    def test_ray_intersection_parallel_rays(self):
        """Test ray intersection with parallel rays."""
        # Create parallel rays
        p1 = np.array([0, 0, 0])
        d1 = np.array([1, 0, 0])
        p2 = np.array([0, 1, 0])
        d2 = np.array([1, 0, 0])  # Same direction
        
        intersection = self.engine._ray_intersection(p1, d1, p2, d2)
        assert intersection is None
    
    def test_ray_intersection_valid_rays(self):
        """Test ray intersection with valid intersecting rays."""
        # Create intersecting rays
        p1 = np.array([0, 0, 0])
        d1 = np.array([1, 1, 0])
        p2 = np.array([1, 0, 0])
        d2 = np.array([-1, 1, 0])
        
        intersection = self.engine._ray_intersection(p1, d1, p2, d2)
        assert intersection is not None
        assert len(intersection) == 3
    
    def test_calculate_bearing(self):
        """Test bearing calculation between two points."""
        # Test bearing from origin to north
        bearing = self.engine._calculate_bearing(0, 0, 1, 0)
        assert abs(bearing - 0) < 1e-6
        
        # Test bearing from origin to east
        bearing = self.engine._calculate_bearing(0, 0, 0, 1)
        assert abs(bearing - 90) < 1e-6
        
        # Test bearing from origin to south
        bearing = self.engine._calculate_bearing(0, 0, -1, 0)
        assert abs(bearing - 180) < 1e-6
        
        # Test bearing from origin to west
        bearing = self.engine._calculate_bearing(0, 0, 0, -1)
        assert abs(bearing - 270) < 1e-6
    
    def test_angle_difference(self):
        """Test angle difference calculation."""
        # Test same angles
        diff = self.engine._angle_difference(45, 45)
        assert diff == 0
        
        # Test 90 degree difference
        diff = self.engine._angle_difference(0, 90)
        assert diff == 90
        
        # Test angle wrapping
        diff = self.engine._angle_difference(350, 10)
        assert diff == 20
        
        # Test negative difference
        diff = self.engine._angle_difference(90, 0)
        assert diff == 90
    
    def test_calculate_confidence(self):
        """Test confidence calculation."""
        confidence = self.engine._calculate_confidence(self.observations)
        assert 0 <= confidence <= 1
        
        # Test with single observation
        single_obs = [self.observations[0]]
        confidence = self.engine._calculate_confidence(single_obs)
        assert 0 <= confidence <= 1
    
    def test_calculate_angular_spread(self):
        """Test angular spread calculation."""
        spread = self.engine._calculate_angular_spread(self.observations)
        assert 0 <= spread <= 360
        
        # Test with bearings in sequence
        sequential_bearings = [0, 90, 180, 270]
        spread = self.engine._calculate_angular_spread([
            BearingObservation(
                device_id="camera_1",
                latitude=40.0,
                longitude=-120.0,
                altitude=1000.0,
                camera_heading=0.0,
                camera_pitch=0.0,
                bearing=bearing,
                confidence=0.9,
                detection_id=f"det_{i}"
            ) for i, bearing in enumerate(sequential_bearings)
        ])
        assert spread == 90  # Maximum gap should be 90 degrees
    
    def test_calculate_baseline_distance(self):
        """Test baseline distance calculation."""
        obs1 = self.observations[0]
        obs2 = self.observations[1]
        
        distance = self.engine._calculate_baseline_distance(obs1, obs2)
        assert distance > 0
        
        # Test with same points
        distance = self.engine._calculate_baseline_distance(obs1, obs1)
        assert distance == 0
    
    def test_latlon_to_cartesian_conversion(self):
        """Test lat/lon to Cartesian conversion."""
        lat, lon, alt = 40.0, -120.0, 1000.0
        cartesian = self.engine._latlon_to_cartesian(lat, lon, alt)
        
        assert len(cartesian) == 3
        assert isinstance(cartesian, np.ndarray)
        
        # Convert back and check
        lat_back, lon_back, alt_back = self.engine._cartesian_to_latlon(cartesian)
        assert abs(lat - lat_back) < 1e-6
        assert abs(lon - lon_back) < 1e-6
        assert abs(alt - alt_back) < 1e-6
    
    def test_bearing_to_direction_conversion(self):
        """Test bearing to direction vector conversion."""
        bearing, pitch = 0.0, 0.0  # North, horizontal
        direction = self.engine._bearing_to_direction(bearing, pitch)
        
        assert len(direction) == 3
        assert isinstance(direction, np.ndarray)
        
        # Check that direction vector is normalized
        magnitude = np.linalg.norm(direction)
        assert abs(magnitude - 1.0) < 1e-6
    
    def test_ransac_outlier_rejection(self):
        """Test RANSAC outlier rejection."""
        # Add an outlier observation
        outlier_obs = BearingObservation(
            device_id="camera_outlier",
            latitude=50.0,  # Far away
            longitude=-100.0,  # Far away
            altitude=2000.0,
            camera_heading=0.0,
            camera_pitch=0.0,
            bearing=0.0,  # Different bearing
            confidence=0.9,
            detection_id="det_outlier"
        )
        
        observations_with_outlier = self.observations + [outlier_obs]
        results = self.engine.triangulate(observations_with_outlier)
        
        # Should still produce results despite outlier
        assert len(results) > 0
        # Outlier should be filtered out
        assert "det_outlier" not in results[0].observation_ids
    
    def test_least_squares_optimization(self):
        """Test least squares optimization method."""
        results = self.engine.triangulate(self.observations)
        
        # Should have at least one result
        assert len(results) > 0
        
        # Check that result has reasonable properties
        result = results[0]
        assert -90 <= result.latitude <= 90
        assert -180 <= result.longitude <= 180
        assert 0 <= result.confidence <= 1
        assert result.uncertainty_meters > 0
