def frame_loads(glass_thk, frame_type, frame_length, frame_width, tran_spacing, wind_neg):
    # Mullion loads
    glass_sw = glass_thk * 0.025
    acc_sw = glass_sw * 0.3
    mul_w_dead = ((glass_sw + acc_sw) * frame_width / 1000)
    mul_w_wind = (wind_neg * frame_width / 1000)
    
    # Transom loads
    if frame_type == "Continuous":
        tran_w_dead = (glass_thk * 0.025) * (frame_width / 1000)
        tran_w_wind = wind_neg * (frame_width / 1000)
    elif tran_spacing and tran_spacing < frame_length and frame_type != "Continuous":
        tran_w_dead = (glass_thk * 0.025) * (frame_width / 1000)
        tran_w_wind = wind_neg * (frame_width / 1000)
    else:
        tran_w_dead = ((glass_thk * 0.025) / 2) * (frame_width / 1000)
        tran_w_wind = (wind_neg / 2) * (frame_width / 1000)
    
    return mul_w_dead, mul_w_wind, tran_w_dead, tran_w_wind

def joint_forces(geometry, frame_width, tran_w_dead, tran_w_wind, joint_fy, joint_fz):
    joint_fy = round(((tran_w_wind * frame_width / 1000) / 4), 2) if geometry == "regular" else joint_fy
    joint_fz = round(((tran_w_dead * frame_width / 1000) / 4), 2) if geometry == "regular" else joint_fz
    
    return joint_fy, joint_fz

def reaction_forces(geometry, frame_type, frame_length, mul_w_dead, mul_w_wind, reaction_Ry, reaction_Rz):
    _frame_length = frame_length * 2
    
    if frame_type == "Floor-to-floor":
        reaction_Ry = round(mul_w_wind * (frame_length / 1000) / 2, 2) if geometry == "regular" else reaction_Ry
        reaction_Rz = round(mul_w_dead * (frame_length / 1000) / 2, 2) if geometry == "regular" else reaction_Rz
    elif frame_type == "Continuous":
        reaction_Ry = round(mul_w_wind * (frame_length / 1000) * (10 / 8), 2) if geometry == "regular" else reaction_Ry
        reaction_Rz = round(mul_w_dead * (_frame_length / 1000), 2) if geometry == "regular" else reaction_Rz
    else:
        reaction_Ry = 0
        reaction_Rz = 0
    
    return reaction_Ry, reaction_Rz
