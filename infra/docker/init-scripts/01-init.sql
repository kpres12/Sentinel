-- Initialize PostGIS and TimescaleDB extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create additional extensions for wildfire operations
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a function to generate H3 indexes
CREATE OR REPLACE FUNCTION lat_lon_to_h3(lat double precision, lon double precision, resolution integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    -- This is a placeholder function
    -- In production, you would use the actual H3 extension
    RETURN 'h3_' || resolution || '_' || round(lat, 6) || '_' || round(lon, 6);
END;
$$;

-- Create a function to calculate distance between points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE plpgsql
AS $$
DECLARE
    earth_radius double precision := 6371000; -- meters
    lat1_rad double precision;
    lat2_rad double precision;
    delta_lat double precision;
    delta_lon double precision;
    a double precision;
    c double precision;
BEGIN
    lat1_rad := radians(lat1);
    lat2_rad := radians(lat2);
    delta_lat := radians(lat2 - lat1);
    delta_lon := radians(lon2 - lon1);
    
    a := sin(delta_lat/2) * sin(delta_lat/2) + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon/2) * sin(delta_lon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN earth_radius * c;
END;
$$;

-- Create a function to calculate bearing between points
CREATE OR REPLACE FUNCTION calculate_bearing(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE plpgsql
AS $$
DECLARE
    lat1_rad double precision;
    lat2_rad double precision;
    delta_lon double precision;
    y double precision;
    x double precision;
    bearing double precision;
BEGIN
    lat1_rad := radians(lat1);
    lat2_rad := radians(lat2);
    delta_lon := radians(lon2 - lon1);
    
    y := sin(delta_lon) * cos(lat2_rad);
    x := cos(lat1_rad) * sin(lat2_rad) - sin(lat1_rad) * cos(lat2_rad) * cos(delta_lon);
    
    bearing := degrees(atan2(y, x));
    
    IF bearing < 0 THEN
        bearing := bearing + 360;
    END IF;
    
    RETURN bearing;
END;
$$;
