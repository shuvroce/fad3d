import numpy as np
import math

location_wind_speeds = {
        "Angarpota": 47.8, "Bagerhat": 77.5, "Bandarban": 62.5, "Barguna": 80.0,
        "Barisal": 78.7, "Bhola": 69.5, "Bogra": 61.9, "Brahmanbaria": 56.7,
        "Chandpur": 50.6, "Chapai Nawabganj": 41.4, "Chittagong": 80.0,
        "Chuadanga": 61.9, "Comilla": 61.4, "Cox’s Bazar": 80.0, "Dahagram": 47.8,
        "Dhaka": 65.7, "Dinajpur": 41.4, "Faridpur": 63.1, "Feni": 64.1,
        "Gaibandha": 65.6, "Gazipur": 66.5, "Gopalganj": 74.5, "Habiganj": 54.2,
        "Hatiya": 80.0, "Ishurdi": 69.5, "Joypurhat": 56.7, "Jamalpur": 56.7,
        "Jessore": 64.1, "Jhalakati": 80.0, "Jhenaidah": 65.0, "Khagrachhari": 56.7,
        "Khulna": 73.3, "Kutubdia": 80.0, "Kishoreganj": 64.7, "Kurigram": 65.6,
        "Kushtia": 66.9, "Lakshmipur": 51.2, "Lalmonirhat": 63.7, "Madaripur": 68.1,
        "Magura": 65.0, "Manikganj": 58.2, "Meherpur": 58.2, "Maheshkhali": 80.0,
        "Moulvibazar": 53.0, "Munshiganj": 57.1, "Mymensingh": 67.4, "Naogaon": 55.2,
        "Narail": 68.6, "Narayanganj": 61.1, "Narsinghdi": 59.7, "Natore": 61.9,
        "Netrokona": 65.6, "Nilphamari": 44.7, "Noakhali": 57.1, "Pabna": 63.1,
        "Panchagarh": 41.4, "Patuakhali": 80.0, "Pirojpur": 80.0, "Rajbari": 59.1,
        "Rajshahi": 49.2, "Rangamati": 56.7, "Rangpur": 65.3, "Satkhira": 57.6,
        "Shariatpur": 61.9, "Sherpur": 62.5, "Sirajganj": 50.6, "Srimangal": 50.6,
        "St. Martin’s Island": 80.0, "Sunamganj": 61.1, "Sylhet": 61.1,
        "Sandwip": 80.0, "Tangail": 50.6, "Teknaf": 80.0, "Thakurgaon": 41.4
    }

def location_wind_load_bd(location):
    location = location.strip()
    return location_wind_speeds[location]


def parse_floor_heights(floor_heights):
    """Parse a space/comma separated string or iterable into a clean list of floats.

    Returns (floors, cumulative_heights).
    """
    if floor_heights is None:
        raise ValueError("floor_heights is required")

    # Accept list/tuple of numbers directly
    if isinstance(floor_heights, (list, tuple, np.ndarray)):
        heights = [float(h) for h in floor_heights if float(h) > 0]
    else:
        tokens = str(floor_heights).replace(",", " ").split()
        if not tokens:
            raise ValueError("floor_heights must contain at least one value")
        heights = []
        for token in tokens:
            try:
                val = float(token)
            except ValueError as exc:
                raise ValueError(f"Invalid floor height value: {token}") from exc
            if val > 0:
                heights.append(val)

    if not heights:
        raise ValueError("No positive floor heights found")

    cumu = list(np.cumsum(heights))
    return heights, cumu

def importance_factor(occupancy_cat):
    """Return ASCE-style importance factor from occupancy category."""
    mapping = {"I": 0.77, "II": 1.0, "III": 1.15, "IV": 1.15}
    return mapping.get(str(occupancy_cat), 1.0)

def base_velocity_pressure(wind_speed, K_d, occupancy_cat):
    """Return q_z at z=10m without Kz/Kzt (0.000613 * Kd * V^2 * I)."""
    Imp_factor = importance_factor(occupancy_cat)
    return 0.000613 * K_d * (wind_speed ** 2) * Imp_factor

def topographic_factor(topography_type, topo_height, topo_length, topo_distance, z, exposure_cat, topo_crest_side):
    # clean and normalize inputs
    exposure_cat = str(exposure_cat).strip().upper()
    topography_type = str(topography_type).strip().capitalize()
    topo_crest_side = str(topo_crest_side).strip().capitalize()

    if topography_type == 'Homogeneous':
        return 1.0
    
    # K1 Table
    K1_table = {
        'Ridge': {'A': 1.30, 'B': 1.45, 'C': 1.55},
        'Escarpment': {'A': 0.75, 'B': 0.85, 'C': 0.95},
        'Hill': {'A': 0.95, 'B': 1.05, 'C': 1.15}
    }

    # γ and μ values
    gamma_values = {'Ridge': 3.0, 'Escarpment': 2.5, 'Hill': 4.0}
    mu_values = {
        'Ridge': {'Upwind': 1.5, 'Downwind': 1.5},
        'Escarpment': {'Upwind': 1.5, 'Downwind': 4.0},
        'Hill': {'Upwind': 1.5, 'Downwind': 1.5}
    }

    try:
        K1_base = K1_table[topography_type][exposure_cat]
        K1 = K1_base * (topo_height / topo_length)

        gamma = gamma_values[topography_type]
        mu = mu_values[topography_type][topo_crest_side]

        # Compute K2 and K3
        K2 = max(0, 1 - abs(topo_distance) / (mu * topo_length))  # Ensure K2 ≥ 0
        K3 = math.exp(-gamma * z / topo_length)

        # Final Kzt
        Kzt = (1 + K1 * K2 * K3) ** 2
        return round(Kzt, 3)

    except KeyError as e:
        raise ValueError(f"Invalid input: {e}")

def gust_factor(b_height, b_length, b_width, wind_speed, b_freq, damping, exposure_cat):
    # Exposure-dependent values
    exposure_data = {
        "A": {"alpha": 0.25, "b": 0.45, "c": 0.30},
        "B": {"alpha": 0.20, "b": 0.35, "c": 0.25},
        "C": {"alpha": 0.15, "b": 0.25, "c": 0.20}
    }

    # Constants
    alpha = exposure_data[exposure_cat]["alpha"]
    b = exposure_data[exposure_cat]["b"]
    c = exposure_data[exposure_cat]["c"]

    epsilon = 0.333
    z_min = 9.14  # 30 ft
    g_Q = 3.4
    ll = 97.54
    g_v = 3.4

    z = max(0.6 * b_height, z_min)
    I_z = c * (10 / z) ** (1 / 6)
    L_z = ll * (z / 10) ** epsilon

    Q = (1 / (1 + 0.63 * ((b_width + b_height) / L_z) ** 0.63)) ** 0.5
    log_term = np.log(3600 * b_freq)
    g_R = (2 * log_term) ** 0.5 + 0.577 / (2 * log_term) ** 0.5

    V_z = b * ((z / 10) ** alpha) * wind_speed
    N1 = (b_freq * L_z) / V_z
    R_n = (7.47 * N1) / ((1 + 10.3 * N1) ** (5 / 3))

    def eta_R(eta):
        return (1 / eta) - (1 / (2 * eta**2)) * (1 - np.exp(-2 * eta))

    eta_h = 4.6 * b_freq * (b_height / V_z)
    eta_B = 4.6 * b_freq * (b_width / V_z)
    eta_L = 15.4 * b_freq * (b_length / V_z)

    R_h = eta_R(eta_h)
    R_B = eta_R(eta_B)
    R_L = eta_R(eta_L)

    R = ((1 / damping) * R_n * R_h * R_B * (0.53 + 0.47 * R_L)) ** 0.5

    temp1 = (g_Q * Q) ** 2
    temp2 = (g_R * R) ** 2
    temp3 = (temp1 + temp2) ** 0.5
    temp4 = (1 + 1.7 * I_z * temp3) / (1 + 1.7 * g_v * I_z)

    G_f = 0.925 * temp4
    return G_f

def velocity_pressure_coeff(exposure_cat, b_height, WFRS):
    # WFRS = Wind Force Resisting System (MWFRS or C&C)
    heights = [
        4.6, 6.1, 7.6, 9.1, 12.2, 15.2, 18.0, 21.3, 24.4, 27.41, 30.5,
        36.6, 42.7, 48.8, 54.9, 61.0, 76.2, 91.4, 106.7, 121.9, 137.2, 152.4
    ]

    data = {
        ("A", "C&C"): [0.7, 0.7, 0.7, 0.7, 0.76, 0.81, 0.85, 0.89, 0.93, 0.96, 0.99,
                        1.04, 1.09, 1.13, 1.17, 1.2, 1.28, 1.35, 1.41, 1.47, 1.52, 1.56],
        ("A", "MWFRS"): [0.57, 0.62, 0.66, 0.7, 0.76, 0.81, 0.85, 0.89, 0.93, 0.96, 0.99,
                        1.04, 1.09, 1.13, 1.17, 1.2, 1.28, 1.35, 1.41, 1.47, 1.52, 1.56],
        ("B", ""): [0.85, 0.9, 0.94, 0.98, 1.04, 1.09, 1.13, 1.17, 1.21, 1.24, 1.26,
                        1.31, 1.36, 1.39, 1.43, 1.46, 1.53, 1.59, 1.64, 1.69, 1.73, 1.77],
        ("C", ""): [1.03, 1.08, 1.12, 1.16, 1.22, 1.27, 1.31, 1.34, 1.38, 1.4, 1.43,
                        1.48, 1.52, 1.55, 1.58, 1.61, 1.68, 1.73, 1.78, 1.82, 1.86, 1.89],
    }

    if exposure_cat == "A":
        key = (exposure_cat, WFRS)
    else:
        key = (exposure_cat, "")

    # Interpolate to get Kz
    kz_values = data[key]
    K_z = float(np.interp(b_height, heights, kz_values))
    return K_z

def external_pressure_coeff(b_length, b_width):
    C_pw = 0.8
    C_ps = -0.7
    
    if b_width / b_length <= 1.0:
        C_pl = -0.5
    elif b_width / b_length > 1.0 and b_width / b_length < 4:
        C_pl = -0.3
    elif b_width / b_length >= 4:
        C_pl = -0.2
    
    return C_pw, C_pl, C_ps

def ext_pressure_coeff_wall_cladd(eff_area):
    if eff_area <= 1.9:
        GCp_z4_p = GCp_z5_p = 0.9
    elif eff_area >= 46.5:
        GCp_z4_p = GCp_z5_p = 0.6
    else:
        GCp_z4_p = GCp_z5_p = 0.6 + (0.9 - 0.6) * ((np.log(46.5) - np.log(eff_area)) / (np.log(46.5) - np.log(1.9)))
    
    if eff_area <= 1.9:
        GCp_z4_n = 0.9
    elif eff_area >= 46.5:
        GCp_z4_n = 0.7
    else:
        GCp_z4_n = 0.7 + (0.9 - 0.7) * ((np.log(46.5) - np.log(eff_area)) / (np.log(46.5) - np.log(1.9)))
    
    if eff_area <= 1.9:
        GCp_z5_n = 1.8
    elif eff_area >= 46.5:
        GCp_z5_n = 1.0
    else:
        GCp_z5_n = 1.0 + (1.8 - 1.0) * ((np.log(46.5) - np.log(eff_area)) / (np.log(46.5) - np.log(1.9)))
    
    return GCp_z4_p, -GCp_z4_n, GCp_z5_p, -GCp_z5_n

def ext_pressure_coeff_roof_cladd(eff_area):
    if eff_area <= 0.9:
        GCp_z1_n = 1.4
    elif eff_area >= 46.5:
        GCp_z1_n = 0.9
    else:
        GCp_z1_n = 0.9 + (1.4 - 0.9) * ((np.log(46.5) - np.log(eff_area)) / (np.log(46.5) - np.log(0.9)))
    
    if eff_area <= 0.9:
        GCp_z2_n = 2.3
    elif eff_area >= 46.5:
        GCp_z2_n = 1.6
    else:
        GCp_z2_n = 1.6 + (2.3 - 1.6) * ((np.log(46.5) - np.log(eff_area)) / (np.log(46.5) - np.log(0.9)))
    
    if eff_area <= 0.9:
        GCp_z3_n = 3.2
    elif eff_area >= 46.5:
        GCp_z3_n = 2.3
    else:
        GCp_z3_n = 2.3 + (3.2 - 2.3) * ((np.log(46.5) - np.log(eff_area)) / (np.log(46.5) - np.log(0.9)))
    
    return -GCp_z1_n, -GCp_z2_n, -GCp_z3_n

def compute_mwfrs_pressures(
    exposure_cat,
    b_length,
    b_width,
    K_d,
    wind_speed,
    occupancy_cat,
    GC_pi,
    topography_type,
    topo_height,
    topo_length,
    topo_distance,
    topo_crest_side,
    floor_heights,
    b_rigidity,
    b_freq,
    damping,
):
    """Compute MWFRS pressures floor-by-floor.

    `floor_heights` can be a list/tuple/ndarray of numbers or a space-separated string
    such as "3.5 3.2 3.2". Returns (summary, per_level).
    """

    floors, cumu_heights = parse_floor_heights(floor_heights)
    b_height = cumu_heights[-1]

    K_h = velocity_pressure_coeff(exposure_cat, b_height, WFRS="MWFRS")
    K_ht = topographic_factor(
        topography_type, topo_height, topo_length, topo_distance, b_height, exposure_cat, topo_crest_side
    ) or 1.0
    C_pw, C_pl, C_ps = external_pressure_coeff(b_length, b_width)
    gust_factor_value = gust_factor(b_height, b_length, b_width, wind_speed, b_freq, damping, exposure_cat) if b_rigidity != "Rigid" else 0.85
    Imp_factor = importance_factor(occupancy_cat)

    q_h = 0.000613 * K_h * K_ht * K_d * wind_speed ** 2 * Imp_factor
    P_hi = q_h * GC_pi
    P_hl = q_h * gust_factor_value * C_pl - P_hi
    P_hs = q_h * gust_factor_value * C_ps - P_hi

    results = []
    for level, height in enumerate(floors, start=1):
        cumu_height = cumu_heights[level - 1]
        K_z = velocity_pressure_coeff(exposure_cat, cumu_height, WFRS="MWFRS")
        K_zt = topographic_factor(
            topography_type, topo_height, topo_length, topo_distance, cumu_height, exposure_cat, topo_crest_side
        ) or 1.0
        q_z = 0.000613 * K_z * K_zt * K_d * wind_speed ** 2 * Imp_factor
        P_zw = q_z * gust_factor_value * C_pw + P_hi

        results.append(
            {
                "level": level,
                "height": round(height, 2),
                "cumu_height": round(cumu_height, 2),
                "K_z": round(K_z, 2),
                "K_zt": round(K_zt, 2),
                "q_z": round(q_z, 2),
                "P_zw": round(P_zw, 2),
            }
        )

    return (
        {
            "b_height": round(b_height, 2),
            "K_h": round(K_h, 2),
            "K_ht": round(K_ht, 2),
            "q_h": round(q_h, 2),
            "P_hi": round(P_hi, 2),
            "P_hl": round(P_hl, 2),
            "P_hs": round(P_hs, 2),
            "gust_factor": round(gust_factor_value, 2),
            "Imp_factor": round(Imp_factor, 2),
            "C_pw": round(C_pw, 2),
            "C_pl": round(C_pl, 2),
            "C_ps": round(C_ps, 2),
            "wind_speed": round(wind_speed, 2),
        },
        results,
    )

def compute_cladding_pressures(
    GC_pi,
    exposure_cat,
    topography_type,
    topo_height,
    topo_length,
    topo_distance,
    topo_crest_side,
    floor_heights,
    wind_speed,
    K_d,
    occupancy_cat
):
    """Compute C&C pressures for each level and effective area."""

    floors, cumu_heights = parse_floor_heights(floor_heights)
    # Per requirement: evaluate only at the top floor (building height)
    top_level = len(floors)
    levels_to_use = [top_level]
    q_zk = base_velocity_pressure(wind_speed, K_d, occupancy_cat)

    wall_results, roof_results = {}, {}

    # Choose area list
    area_list = [5.0, 10.0, 20.0, 30.0, 40.0, 46.5]

    for A_eff in area_list:
        GCp_z4_p, GCp_z4_n, GCp_z5_p, GCp_z5_n = ext_pressure_coeff_wall_cladd(A_eff)
        GCp_z1_n, GCp_z2_n, GCp_z3_n = ext_pressure_coeff_roof_cladd(A_eff)

        wall_rows = []
        roof_rows = []

        # Single level: top of building
        level = levels_to_use[0]
        height = cumu_heights[level - 1]
        K_z = velocity_pressure_coeff(exposure_cat, height, WFRS="C&C")
        K_zt = topographic_factor(
            topography_type, topo_height, topo_length, topo_distance, height, exposure_cat, topo_crest_side
        )
        q_z = q_zk * K_z * K_zt
        P_zi = q_z * GC_pi

        wall_rows.append(
            {
                "level": level,
                "A_eff": A_eff,
                "height": round(height, 2),
                "K_z": round(K_z, 2),
                "K_zt": round(K_zt, 2),
                "q_z": round(q_z, 2),
                "P_zi": round(P_zi, 2),
                "P_z4_pos": round(q_z * GCp_z4_p + P_zi, 2),
                "P_z4_neg": round(q_z * GCp_z4_n - P_zi, 2),
                "P_z5_pos": round(q_z * GCp_z5_p + P_zi, 2),
                "P_z5_neg": round(q_z * GCp_z5_n - P_zi, 2),
            }
        )

        roof_rows.append(
            {
                "level": level,
                "A_eff": A_eff,
                "height": round(height, 2),
                "K_z": round(K_z, 2),
                "K_zt": round(K_zt, 2),
                "q_z": round(q_z, 2),
                "P_zi": round(P_zi, 2),
                "P_z1_neg": round(q_z * GCp_z1_n - P_zi, 2),
                "P_z2_neg": round(q_z * GCp_z2_n - P_zi, 2),
                "P_z3_neg": round(q_z * GCp_z3_n - P_zi, 2),
            }
        )

        wall_results[A_eff] = wall_rows
        roof_results[A_eff] = roof_rows

    return wall_results, roof_results