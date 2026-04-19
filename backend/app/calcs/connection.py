from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float

ALUM_ULTIMATE = 207  # MPa
MAX_HEAD_DIA = 19.1  # mm


def calc_connection(conn: Dict[str, Any], frame: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not conn or not frame:
        return None

    # Joint forces (pre-computed by frame calc and merged by calcEngine / calc_helpers)
    joint_fy = _to_float(frame.get("joint_fy"))
    joint_fz = _to_float(frame.get("joint_fz"))

    if joint_fy is None or joint_fz is None:
        return None

    design_fy = joint_fy * 1.6
    design_fz = joint_fz * 1.4

    screw_nos = _to_float(conn.get("screw_nos"))
    screw_dia = _to_float(conn.get("screw_dia"))
    head_dia = _to_float(conn.get("head_dia"))
    t1 = _to_float(conn.get("t1"))
    t2 = _to_float(conn.get("t2"))
    tc = _to_float(conn.get("tc"))

    if not all([screw_nos, screw_dia, head_dia, t1, t2, tc]):
        return None

    # Screw shear capacity
    R_yB = design_fy / (screw_nos / 2)
    R_zB = design_fz / (screw_nos / 2)
    resultant_shear = (R_yB**2 + R_zB**2)**0.5

    # Pull-over (tilting)
    Pnv1 = 4.2 * (t2 ** 3 * screw_dia) ** 0.5 * ALUM_ULTIMATE
    Pnv2 = 2.7 * (t1 * screw_dia) * ALUM_ULTIMATE
    Pnv3 = 2.7 * (t2 * screw_dia) * ALUM_ULTIMATE
    phi_Pnv = round(0.5 * min(Pnv1, Pnv2, Pnv3) / 1000, 2)

    # Pull-out
    phi_Pnot = round(0.5 * 0.85 * tc * screw_dia * ALUM_ULTIMATE / 1000, 2)

    # Pull-over tension
    d_w = min(head_dia, MAX_HEAD_DIA)
    phi_Pnov = round(0.5 * 1.5 * t1 * d_w * ALUM_ULTIMATE / 1000, 2)

    # Ratios
    beta_pullover = (resultant_shear / (phi_Pnv / 0.5)) + (0.71 * R_zB / (phi_Pnov / 0.5))
    beta_pullout = (resultant_shear / (phi_Pnv / 0.5)) + (R_zB / (phi_Pnot / 0.5))

    return {
        "joint_fy": round(joint_fy, 2),
        "joint_fz": round(joint_fz, 2),
        "R_zA": round(R_zB, 2),
        "R_yA": round(R_yB, 2),
        "Vu": round(resultant_shear, 2),
        "d_w": round(d_w, 2),
        "phi_Pnv": round(phi_Pnv, 2),
        "phi_Pnot": round(phi_Pnot, 2),
        "phi_Pnov": round(phi_Pnov, 2),
        "beta_pullover": round(beta_pullover, 2),
        "beta_pullout": round(beta_pullout, 2),
    }
