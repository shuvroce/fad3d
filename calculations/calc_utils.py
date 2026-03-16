# from typing import Dict, Optional, Any
from typing import Optional, Any

def _to_float(value: Any) -> Optional[float]:
    try:
        v = float(value)
        return v
    except (TypeError, ValueError):
        return None
