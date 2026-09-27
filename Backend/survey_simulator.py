# ============================================================
# DEMO SURVEY SIMULATOR
# ============================================================

"""
This module generates SIMULATED GPS and depth values.

These values are NOT extracted from the sonar image.

They are only used to demonstrate how the software
can associate a detected sonar object with survey
navigation and depth information.

In a future hardware version, this module can be
replaced by real GPS + depth sensor data.
"""


START_LATITUDE = 18.5204
START_LONGITUDE = 73.8567

LATITUDE_STEP = 0.0001
LONGITUDE_STEP = 0.0001

START_DEPTH = 20.0
DEPTH_STEP = 0.8


def get_demo_survey_data(point_number: int = 0):

    latitude = (
        START_LATITUDE
        + point_number * LATITUDE_STEP
    )

    longitude = (
        START_LONGITUDE
        + point_number * LONGITUDE_STEP
    )

    depth = (
        START_DEPTH
        + point_number * DEPTH_STEP
    )

    return {
        "latitude": round(
            latitude,
            6,
        ),

        "longitude": round(
            longitude,
            6,
        ),

        "depth_m": round(
            depth,
            1,
        ),

        "survey_point": (
            point_number + 1
        ),

        "gps_source": (
            "demo_simulation"
        ),

        "depth_source": (
            "demo_simulation"
        ),
    }