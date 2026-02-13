"""
Global pytest configuration

确保 src 目录在 Python 路径中
"""

import sys
from pathlib import Path

# 将 src 目录添加到 Python 路径
src_path = Path(__file__).parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))
