import os
import sys
import tempfile
from pathlib import Path
import pytest

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Create isolated temporary database file for the test session
_temp_dir = tempfile.mkdtemp(prefix="test_rcy_")
_test_db_path = Path(_temp_dir) / "test_recovery_manager.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path.as_posix()}"

# Set test environment secrets
os.environ["AGENT_API_KEY"] = "test-agent-secret-key-round3"
os.environ["ALLOWED_ORGS"] = "org_demo_alpha,org_demo_bravo"
os.environ["REQUIRE_AUTH"] = "false"
os.environ["GEMINI_API_KEY"] = ""

from app.config.settings import settings
settings.DATABASE_URL = f"sqlite:///{_test_db_path.as_posix()}"
settings.AGENT_API_KEY = "test-agent-secret-key-round3"
settings.ALLOWED_ORGS = "org_demo_alpha,org_demo_bravo"

from app.database.session import init_db, SessionLocal, engine
from seed import seed_database


@pytest.fixture(scope="session", autouse=True)
def initialize_isolated_test_database():
    """
    Initializes tables and seeds demo data on the isolated temporary test database.
    Ensures tests never touch or mutate the workspace recovery_manager.db.
    """
    init_db()
    seed_database()
    yield
    # Cleanup temporary database
    engine.dispose()
    try:
        if _test_db_path.exists():
            _test_db_path.unlink()
        Path(_temp_dir).rmdir()
    except Exception:
        pass
