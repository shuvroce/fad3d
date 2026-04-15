"""
ASTM E1300 Glass NFL & Deflection — Plate Bending Theory
=========================================================
Non-Factored Load (NFL) and maximum deflection are computed analytically
using classical rectangular plate bending theory (Timoshenko & Woinowsky-Krieger,
"Theory of Plates and Shells").

This avoids manual ASTM E1300 chart lookup while remaining conservative:
linear (small-deflection) theory gives slightly lower NFL than the ASTM E1300
charts (which account for large-deflection membrane stiffening), so results
are on the safe side.

Support type mapping (from UI values):
  "four-edges"  → SSSS (4-sided simply supported)
  "three-edges" → SSSF (3 sides SS, 1 long edge free) — conservatively treated as SS2
  "two-edges"   → SSFF / cylindrical bending (2-sided simply supported)
"""

import numpy as np
from typing import Optional

# ─── Glass material constants (ASTM E1300) ────────────────────────────────────
E_GLASS = 71_700.0        # MPa  (Young's modulus, soda-lime glass)
NU_GLASS = 0.22           # Poisson's ratio
# Allowable surface stress for AN glass: 8-min load duration, failure prob 0.001
# (Same basis used to generate the ASTM E1300 NFL charts)
SIGMA_ALLOW_AN = 23.3     # MPa

# ─── Timoshenko SSSS Coefficients (4-sided simply supported, uniform load) ────
# Source: Timoshenko & Woinowsky-Krieger, "Theory of Plates and Shells", Table 26
# a = longer side, b = shorter side (a ≥ b), aspect = a/b
#   col 0: aspect ratio (a/b)
#   col 1: moment coefficient α₁  →  M_max = α₁ · q · b²
#   col 2: deflection coefficient α_w  →  w_max = α_w · q · b⁴ / D
#
# Note: max stress  σ = 6·M_max / t² = 6·α₁ · q · b² / t²
#       NFL         = σ_allow · t² / (6·α₁ · b²)
_SSSS = np.array([
    # a/b    α₁        α_w
    [1.0,   0.0479,   0.00406],
    [1.1,   0.0554,   0.00485],
    [1.2,   0.0627,   0.00564],
    [1.3,   0.0693,   0.00638],
    [1.4,   0.0753,   0.00705],
    [1.5,   0.0812,   0.00772],
    [1.6,   0.0862,   0.00830],
    [1.7,   0.0908,   0.00883],
    [1.8,   0.0948,   0.00931],
    [1.9,   0.0985,   0.00974],
    [2.0,   0.1017,   0.01013],
    [3.0,   0.1189,   0.01223],
    [5.0,   0.1235,   0.01282],
    [100.,  0.1250,   0.01302],  # ≈ ∞  (approaches 2-sided beam value)
])

# ─── 2-sided SS / cylindrical bending (beam theory, exact) ───────────────────
# σ_max = 0.75 · q · b² / t²  →  α₁ = 1/8 = 0.125
# w_max = (5/384) · q · b⁴ / (E·t³/12)  =  5·q·b⁴ / (32·E·t³)
# In plate rigidity form:  w = α_w · q · b⁴ / D,  D = E·t³/(12(1−ν²))
_2SS_ALPHA1 = 0.125
_2SS_ALPHA_W = 5.0 / (384.0 * (1.0 - NU_GLASS**2))   # ≈ 0.01369


def _plate_rigidity(t_mm: float) -> float:
    """Plate rigidity D  [N·mm]  for glass thickness t [mm]."""
    return (E_GLASS * t_mm**3) / (12.0 * (1.0 - NU_GLASS**2))


def _ssss_coeffs(aspect: float) -> tuple:
    """Interpolate (α₁, α_w) from the SSSS table for a given aspect ratio."""
    r = max(1.0, aspect)
    a1  = float(np.interp(r, _SSSS[:, 0], _SSSS[:, 1]))
    aw  = float(np.interp(r, _SSSS[:, 0], _SSSS[:, 2]))
    return a1, aw


def _get_coeffs(support_type: str, aspect: float) -> tuple:
    """
    Return (α₁, α_w) for the given support type and aspect ratio.

    3-sided SS is conservatively treated as 2-sided (beam) bending,
    giving lower NFL (safe side) than the actual 3-edge case.
    """
    st = (support_type or "").lower()
    if "four" in st or "4" in st:
        return _ssss_coeffs(aspect)
    # two-edges or three-edges: cylindrical bending (conservative for 3-sided)
    return _2SS_ALPHA1, _2SS_ALPHA_W


# ─── Public API ───────────────────────────────────────────────────────────────

def nfl_monolithic(
    length_mm: float,
    width_mm: float,
    thickness_mm: float,
    support_type: str = "four-edges",
    sigma_allow: float = SIGMA_ALLOW_AN,
) -> Optional[float]:
    """
    Non-Factored Load [kPa] for a monolithic glass pane.

    Parameters
    ----------
    length_mm, width_mm : panel dimensions (mm); order does not matter.
    thickness_mm        : nominal glass thickness (mm).
    support_type        : "four-edges" | "three-edges" | "two-edges"
    sigma_allow         : allowable surface stress (MPa); default = AN glass.

    Returns
    -------
    NFL in kPa, or None if any required input is missing / ≤ 0.
    """
    if not all(v and v > 0 for v in [length_mm, width_mm, thickness_mm]):
        return None

    a = max(length_mm, width_mm)   # longer dimension
    b = min(length_mm, width_mm)   # shorter dimension (span)
    t = thickness_mm
    aspect = a / b

    alpha1, _ = _get_coeffs(support_type, aspect)

    # σ_max = 6·α₁·q·b² / t²  →  solve for q = NFL
    # NFL [N/mm²] = σ_allow·t² / (6·α₁·b²)
    nfl_nmm2 = sigma_allow * t**2 / (6.0 * alpha1 * b**2)
    return round(nfl_nmm2 * 1000.0, 3)   # convert MPa → kPa


def deflection_monolithic(
    length_mm: float,
    width_mm: float,
    thickness_mm: float,
    load_kpa: float,
    support_type: str = "four-edges",
) -> Optional[float]:
    """
    Maximum center deflection [mm] for a monolithic glass pane under load_kpa.

    w_max = α_w · q · b⁴ / D
    """
    if not all(v and v > 0 for v in [length_mm, width_mm, thickness_mm, load_kpa]):
        return None

    a = max(length_mm, width_mm)
    b = min(length_mm, width_mm)
    t = thickness_mm
    aspect = a / b
    q = load_kpa * 1e-3             # kPa → N/mm²

    _, alpha_w = _get_coeffs(support_type, aspect)
    D = _plate_rigidity(t)

    w = alpha_w * q * b**4 / D
    return round(w, 3)


def nfl_laminated(
    length_mm: float,
    width_mm: float,
    t_ply1_mm: float,
    t_ply2_mm: float,
    support_type: str = "four-edges",
) -> Optional[float]:
    """
    NFL [kPa] for a laminated glass unit (LGU).

    Uses the ASTM E1300 Annex A1 conservative effective thickness
    (Γ = 0 — no interlayer coupling):
        h_ef = (t1³ + t2³)^(1/3)
    """
    if not all(v and v > 0 for v in [length_mm, width_mm, t_ply1_mm, t_ply2_mm]):
        return None
    h_ef = (t_ply1_mm**3 + t_ply2_mm**3) ** (1.0 / 3.0)
    return nfl_monolithic(length_mm, width_mm, h_ef, support_type)


def deflection_laminated(
    length_mm: float,
    width_mm: float,
    t_ply1_mm: float,
    t_ply2_mm: float,
    load_kpa: float,
    support_type: str = "four-edges",
) -> Optional[float]:
    """
    Maximum deflection [mm] for a laminated glass unit (LGU).
    Uses the same conservative effective thickness as nfl_laminated.
    """
    if not all(v and v > 0 for v in [length_mm, width_mm, t_ply1_mm, t_ply2_mm, load_kpa]):
        return None
    h_ef = (t_ply1_mm**3 + t_ply2_mm**3) ** (1.0 / 3.0)
    return deflection_monolithic(length_mm, width_mm, h_ef, load_kpa, support_type)
