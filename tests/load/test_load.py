"""
Load tests for the wildfire operations platform.
"""

import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict, Any
import json


class LoadTester:
    """Load testing utility for the wildfire operations platform."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[Dict[str, Any]] = []
    
    async def test_telemetry_endpoint(self, num_requests: int = 100, concurrency: int = 10):
        """Test telemetry endpoint under load."""
        print(f"Testing telemetry endpoint with {num_requests} requests, concurrency {concurrency}")
        
        async def make_request(session: aiohttp.ClientSession, request_id: int):
            """Make a single telemetry request."""
            telemetry_data = {
                "device_id": f"load_test_device_{request_id % 10}",
                "timestamp": "2024-01-01T00:00:00Z",
                "latitude": 40.0 + (request_id % 100) * 0.001,
                "longitude": -120.0 + (request_id % 100) * 0.001,
                "altitude": 1000.0,
                "yaw": request_id % 360,
                "pitch": 0.0,
                "roll": 0.0,
                "speed": 5.0 + (request_id % 10),
                "battery_level": 85.0 - (request_id % 20),
                "sensors": [
                    {
                        "name": "temperature",
                        "unit": "celsius",
                        "value": 25.0 + (request_id % 10),
                        "timestamp": "2024-01-01T00:00:00Z"
                    }
                ],
                "status": "online",
                "comms_rssi": -65.0 - (request_id % 20),
                "temperature": 25.0 + (request_id % 10)
            }
            
            start_time = time.time()
            try:
                async with session.post(f"{self.base_url}/api/v1/telemetry/", json=telemetry_data) as response:
                    end_time = time.time()
                    response_time = end_time - start_time
                    
                    return {
                        "request_id": request_id,
                        "status_code": response.status,
                        "response_time": response_time,
                        "success": response.status == 200
                    }
            except Exception as e:
                end_time = time.time()
                response_time = end_time - start_time
                return {
                    "request_id": request_id,
                    "status_code": 0,
                    "response_time": response_time,
                    "success": False,
                    "error": str(e)
                }
        
        # Run load test
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(concurrency)
            
            async def bounded_request(request_id):
                async with semaphore:
                    return await make_request(session, request_id)
            
            tasks = [bounded_request(i) for i in range(num_requests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Process results
        successful_requests = [r for r in results if isinstance(r, dict) and r.get("success", False)]
        failed_requests = [r for r in results if isinstance(r, dict) and not r.get("success", False)]
        
        response_times = [r["response_time"] for r in successful_requests]
        
        print(f"Telemetry Load Test Results:")
        print(f"  Total requests: {num_requests}")
        print(f"  Successful: {len(successful_requests)}")
        print(f"  Failed: {len(failed_requests)}")
        print(f"  Success rate: {len(successful_requests) / num_requests * 100:.2f}%")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Requests per second: {num_requests / total_time:.2f}")
        
        if response_times:
            print(f"  Average response time: {statistics.mean(response_times):.3f}s")
            print(f"  Median response time: {statistics.median(response_times):.3f}s")
            print(f"  Min response time: {min(response_times):.3f}s")
            print(f"  Max response time: {max(response_times):.3f}s")
            print(f"  95th percentile: {self.percentile(response_times, 95):.3f}s")
            print(f"  99th percentile: {self.percentile(response_times, 99):.3f}s")
        
        return {
            "endpoint": "telemetry",
            "total_requests": num_requests,
            "successful_requests": len(successful_requests),
            "failed_requests": len(failed_requests),
            "success_rate": len(successful_requests) / num_requests,
            "total_time": total_time,
            "requests_per_second": num_requests / total_time,
            "response_times": response_times
        }
    
    async def test_detections_endpoint(self, num_requests: int = 100, concurrency: int = 10):
        """Test detections endpoint under load."""
        print(f"Testing detections endpoint with {num_requests} requests, concurrency {concurrency}")
        
        async def make_request(session: aiohttp.ClientSession, request_id: int):
            """Make a single detection request."""
            detection_data = {
                "device_id": f"load_test_device_{request_id % 10}",
                "timestamp": "2024-01-01T00:00:00Z",
                "type": "smoke" if request_id % 2 == 0 else "flame",
                "latitude": 40.0 + (request_id % 100) * 0.001,
                "longitude": -120.0 + (request_id % 100) * 0.001,
                "bearing": request_id % 360,
                "confidence": 0.5 + (request_id % 50) / 100,
                "media_ref": f"video_{request_id % 10}_frame_{request_id}",
                "source": "edge",
                "metadata": {
                    "camera_id": f"cam_{request_id % 5}",
                    "frame_number": request_id
                }
            }
            
            start_time = time.time()
            try:
                async with session.post(f"{self.base_url}/api/v1/detections/", json=detection_data) as response:
                    end_time = time.time()
                    response_time = end_time - start_time
                    
                    return {
                        "request_id": request_id,
                        "status_code": response.status,
                        "response_time": response_time,
                        "success": response.status == 200
                    }
            except Exception as e:
                end_time = time.time()
                response_time = end_time - start_time
                return {
                    "request_id": request_id,
                    "status_code": 0,
                    "response_time": response_time,
                    "success": False,
                    "error": str(e)
                }
        
        # Run load test
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(concurrency)
            
            async def bounded_request(request_id):
                async with semaphore:
                    return await make_request(session, request_id)
            
            tasks = [bounded_request(i) for i in range(num_requests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Process results
        successful_requests = [r for r in results if isinstance(r, dict) and r.get("success", False)]
        failed_requests = [r for r in results if isinstance(r, dict) and not r.get("success", False)]
        
        response_times = [r["response_time"] for r in successful_requests]
        
        print(f"Detections Load Test Results:")
        print(f"  Total requests: {num_requests}")
        print(f"  Successful: {len(successful_requests)}")
        print(f"  Failed: {len(failed_requests)}")
        print(f"  Success rate: {len(successful_requests) / num_requests * 100:.2f}%")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Requests per second: {num_requests / total_time:.2f}")
        
        if response_times:
            print(f"  Average response time: {statistics.mean(response_times):.3f}s")
            print(f"  Median response time: {statistics.median(response_times):.3f}s")
            print(f"  Min response time: {min(response_times):.3f}s")
            print(f"  Max response time: {max(response_times):.3f}s")
            print(f"  95th percentile: {self.percentile(response_times, 95):.3f}s")
            print(f"  99th percentile: {self.percentile(response_times, 99):.3f}s")
        
        return {
            "endpoint": "detections",
            "total_requests": num_requests,
            "successful_requests": len(successful_requests),
            "failed_requests": len(failed_requests),
            "success_rate": len(successful_requests) / num_requests,
            "total_time": total_time,
            "requests_per_second": num_requests / total_time,
            "response_times": response_times
        }
    
    async def test_triangulation_endpoint(self, num_requests: int = 50, concurrency: int = 5):
        """Test triangulation endpoint under load."""
        print(f"Testing triangulation endpoint with {num_requests} requests, concurrency {concurrency}")
        
        async def make_request(session: aiohttp.ClientSession, request_id: int):
            """Make a single triangulation request."""
            triangulation_data = {
                "observations": [
                    {
                        "device_id": f"camera_{request_id % 3}",
                        "timestamp": "2024-01-01T00:00:00Z",
                        "device_latitude": 40.0 + (request_id % 10) * 0.01,
                        "device_longitude": -120.0 + (request_id % 10) * 0.01,
                        "device_altitude": 1000.0,
                        "camera_heading": request_id % 360,
                        "camera_pitch": 0.0,
                        "bearing": 45.0 + (request_id % 90),
                        "confidence": 0.7 + (request_id % 30) / 100,
                        "detection_id": f"det_{request_id}"
                    },
                    {
                        "device_id": f"camera_{(request_id + 1) % 3}",
                        "timestamp": "2024-01-01T00:00:00Z",
                        "device_latitude": 40.1 + (request_id % 10) * 0.01,
                        "device_longitude": -119.9 + (request_id % 10) * 0.01,
                        "device_altitude": 1100.0,
                        "camera_heading": (request_id + 90) % 360,
                        "camera_pitch": 0.0,
                        "bearing": 315.0 + (request_id % 90),
                        "confidence": 0.8 + (request_id % 20) / 100,
                        "detection_id": f"det_{request_id + 1}"
                    }
                ],
                "max_distance_km": 50.0,
                "min_confidence": 0.7
            }
            
            start_time = time.time()
            try:
                async with session.post(f"{self.base_url}/api/v1/triangulation/triangulate", json=triangulation_data) as response:
                    end_time = time.time()
                    response_time = end_time - start_time
                    
                    return {
                        "request_id": request_id,
                        "status_code": response.status,
                        "response_time": response_time,
                        "success": response.status == 200
                    }
            except Exception as e:
                end_time = time.time()
                response_time = end_time - start_time
                return {
                    "request_id": request_id,
                    "status_code": 0,
                    "response_time": response_time,
                    "success": False,
                    "error": str(e)
                }
        
        # Run load test
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(concurrency)
            
            async def bounded_request(request_id):
                async with semaphore:
                    return await make_request(session, request_id)
            
            tasks = [bounded_request(i) for i in range(num_requests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Process results
        successful_requests = [r for r in results if isinstance(r, dict) and r.get("success", False)]
        failed_requests = [r for r in results if isinstance(r, dict) and not r.get("success", False)]
        
        response_times = [r["response_time"] for r in successful_requests]
        
        print(f"Triangulation Load Test Results:")
        print(f"  Total requests: {num_requests}")
        print(f"  Successful: {len(successful_requests)}")
        print(f"  Failed: {len(failed_requests)}")
        print(f"  Success rate: {len(successful_requests) / num_requests * 100:.2f}%")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Requests per second: {num_requests / total_time:.2f}")
        
        if response_times:
            print(f"  Average response time: {statistics.mean(response_times):.3f}s")
            print(f"  Median response time: {statistics.median(response_times):.3f}s")
            print(f"  Min response time: {min(response_times):.3f}s")
            print(f"  Max response time: {max(response_times):.3f}s")
            print(f"  95th percentile: {self.percentile(response_times, 95):.3f}s")
            print(f"  99th percentile: {self.percentile(response_times, 99):.3f}s")
        
        return {
            "endpoint": "triangulation",
            "total_requests": num_requests,
            "successful_requests": len(successful_requests),
            "failed_requests": len(failed_requests),
            "success_rate": len(successful_requests) / num_requests,
            "total_time": total_time,
            "requests_per_second": num_requests / total_time,
            "response_times": response_times
        }
    
    async def test_mixed_load(self, num_requests: int = 200, concurrency: int = 20):
        """Test mixed load across multiple endpoints."""
        print(f"Testing mixed load with {num_requests} requests, concurrency {concurrency}")
        
        async def make_mixed_request(session: aiohttp.ClientSession, request_id: int):
            """Make a request to different endpoints based on request_id."""
            endpoint_type = request_id % 4
            
            if endpoint_type == 0:  # Telemetry
                data = {
                    "device_id": f"load_test_device_{request_id % 10}",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "latitude": 40.0 + (request_id % 100) * 0.001,
                    "longitude": -120.0 + (request_id % 100) * 0.001,
                    "altitude": 1000.0,
                    "yaw": request_id % 360,
                    "pitch": 0.0,
                    "roll": 0.0,
                    "speed": 5.0 + (request_id % 10),
                    "battery_level": 85.0 - (request_id % 20),
                    "sensors": [],
                    "status": "online"
                }
                url = f"{self.base_url}/api/v1/telemetry/"
                method = "POST"
                
            elif endpoint_type == 1:  # Detections
                data = {
                    "device_id": f"load_test_device_{request_id % 10}",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "type": "smoke" if request_id % 2 == 0 else "flame",
                    "latitude": 40.0 + (request_id % 100) * 0.001,
                    "longitude": -120.0 + (request_id % 100) * 0.001,
                    "bearing": request_id % 360,
                    "confidence": 0.5 + (request_id % 50) / 100,
                    "media_ref": f"video_{request_id % 10}_frame_{request_id}",
                    "source": "edge",
                    "metadata": {}
                }
                url = f"{self.base_url}/api/v1/detections/"
                method = "POST"
                
            elif endpoint_type == 2:  # Get telemetry
                data = None
                url = f"{self.base_url}/api/v1/telemetry/?limit=10"
                method = "GET"
                
            else:  # Get detections
                data = None
                url = f"{self.base_url}/api/v1/detections/?limit=10"
                method = "GET"
            
            start_time = time.time()
            try:
                if method == "POST":
                    async with session.post(url, json=data) as response:
                        end_time = time.time()
                        response_time = end_time - start_time
                        
                        return {
                            "request_id": request_id,
                            "endpoint_type": endpoint_type,
                            "status_code": response.status,
                            "response_time": response_time,
                            "success": response.status == 200
                        }
                else:
                    async with session.get(url) as response:
                        end_time = time.time()
                        response_time = end_time - start_time
                        
                        return {
                            "request_id": request_id,
                            "endpoint_type": endpoint_type,
                            "status_code": response.status,
                            "response_time": response_time,
                            "success": response.status == 200
                        }
            except Exception as e:
                end_time = time.time()
                response_time = end_time - start_time
                return {
                    "request_id": request_id,
                    "endpoint_type": endpoint_type,
                    "status_code": 0,
                    "response_time": response_time,
                    "success": False,
                    "error": str(e)
                }
        
        # Run load test
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(concurrency)
            
            async def bounded_request(request_id):
                async with semaphore:
                    return await make_mixed_request(session, request_id)
            
            tasks = [bounded_request(i) for i in range(num_requests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Process results
        successful_requests = [r for r in results if isinstance(r, dict) and r.get("success", False)]
        failed_requests = [r for r in results if isinstance(r, dict) and not r.get("success", False)]
        
        response_times = [r["response_time"] for r in successful_requests]
        
        # Group by endpoint type
        endpoint_stats = {}
        for result in results:
            if isinstance(result, dict) and "endpoint_type" in result:
                endpoint_type = result["endpoint_type"]
                if endpoint_type not in endpoint_stats:
                    endpoint_stats[endpoint_type] = {"successful": 0, "failed": 0, "response_times": []}
                
                if result.get("success", False):
                    endpoint_stats[endpoint_type]["successful"] += 1
                else:
                    endpoint_stats[endpoint_type]["failed"] += 1
                
                endpoint_stats[endpoint_type]["response_times"].append(result["response_time"])
        
        print(f"Mixed Load Test Results:")
        print(f"  Total requests: {num_requests}")
        print(f"  Successful: {len(successful_requests)}")
        print(f"  Failed: {len(failed_requests)}")
        print(f"  Success rate: {len(successful_requests) / num_requests * 100:.2f}%")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Requests per second: {num_requests / total_time:.2f}")
        
        if response_times:
            print(f"  Average response time: {statistics.mean(response_times):.3f}s")
            print(f"  Median response time: {statistics.median(response_times):.3f}s")
            print(f"  Min response time: {min(response_times):.3f}s")
            print(f"  Max response time: {max(response_times):.3f}s")
            print(f"  95th percentile: {self.percentile(response_times, 95):.3f}s")
            print(f"  99th percentile: {self.percentile(response_times, 99):.3f}s")
        
        print(f"\nEndpoint-specific results:")
        endpoint_names = ["Telemetry POST", "Detections POST", "Telemetry GET", "Detections GET"]
        for endpoint_type, stats in endpoint_stats.items():
            total = stats["successful"] + stats["failed"]
            success_rate = stats["successful"] / total if total > 0 else 0
            avg_response_time = statistics.mean(stats["response_times"]) if stats["response_times"] else 0
            
            print(f"  {endpoint_names[endpoint_type]}:")
            print(f"    Total: {total}")
            print(f"    Success rate: {success_rate * 100:.2f}%")
            print(f"    Average response time: {avg_response_time:.3f}s")
        
        return {
            "endpoint": "mixed",
            "total_requests": num_requests,
            "successful_requests": len(successful_requests),
            "failed_requests": len(failed_requests),
            "success_rate": len(successful_requests) / num_requests,
            "total_time": total_time,
            "requests_per_second": num_requests / total_time,
            "response_times": response_times,
            "endpoint_stats": endpoint_stats
        }
    
    def percentile(self, data: List[float], percentile: float) -> float:
        """Calculate percentile of data."""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    async def run_all_tests(self):
        """Run all load tests."""
        print("Starting comprehensive load testing...")
        print("=" * 50)
        
        results = []
        
        # Test individual endpoints
        results.append(await self.test_telemetry_endpoint(100, 10))
        print()
        
        results.append(await self.test_detections_endpoint(100, 10))
        print()
        
        results.append(await self.test_triangulation_endpoint(50, 5))
        print()
        
        # Test mixed load
        results.append(await self.test_mixed_load(200, 20))
        print()
        
        # Summary
        print("=" * 50)
        print("LOAD TEST SUMMARY")
        print("=" * 50)
        
        total_requests = sum(r["total_requests"] for r in results)
        total_successful = sum(r["successful_requests"] for r in results)
        total_failed = sum(r["failed_requests"] for r in results)
        overall_success_rate = total_successful / total_requests if total_requests > 0 else 0
        
        print(f"Total requests across all tests: {total_requests}")
        print(f"Total successful: {total_successful}")
        print(f"Total failed: {total_failed}")
        print(f"Overall success rate: {overall_success_rate * 100:.2f}%")
        
        all_response_times = []
        for result in results:
            all_response_times.extend(result["response_times"])
        
        if all_response_times:
            print(f"Overall average response time: {statistics.mean(all_response_times):.3f}s")
            print(f"Overall median response time: {statistics.median(all_response_times):.3f}s")
            print(f"Overall 95th percentile: {self.percentile(all_response_times, 95):.3f}s")
            print(f"Overall 99th percentile: {self.percentile(all_response_times, 99):.3f}s")
        
        return results


async def main():
    """Main function to run load tests."""
    tester = LoadTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
