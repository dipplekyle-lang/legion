import sys
import legion_app as _m
sys.modules['app'] = _m
if __name__ == "__main__":
    _m._run()
