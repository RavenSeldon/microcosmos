"""URL registration for the static Dark Microcosmos release only."""
from flask import Blueprint

from .views import publication

microcosmos_bp = Blueprint("microcosmos", __name__, url_prefix="/microcosmos")

# Endpoint names carry the "microcosmos_" prefix for the reason documented in
# first_notice/url.py: create_app() aliases the bare part of every
# "<blueprint>.<name>" endpoint when that short name is free, so a plain
# "index" would capture url_for('index') from the blog's own templates.
microcosmos_bp.add_url_rule(
    "", endpoint="microcosmos_without_slash", view_func=publication,
    defaults={"asset_path": ""},
)
microcosmos_bp.add_url_rule(
    "/", endpoint="microcosmos_index", view_func=publication,
    defaults={"asset_path": ""},
)
microcosmos_bp.add_url_rule(
    "/<path:asset_path>", endpoint="microcosmos_file", view_func=publication,
)
