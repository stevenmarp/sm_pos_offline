# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
from odoo.tools import file_open


class PosOfflineController(http.Controller):
    # Served by a controller (not as a plain static file) so we can send the
    # Service-Worker-Allowed header: the SW file lives under /sm_pos_offline/static/
    # but must control the /pos/ scope.
    @http.route("/sm_pos_offline/service_worker.js", type="http", auth="public")
    def service_worker(self):
        with file_open("sm_pos_offline/static/src/service_worker.js") as f:
            body = f.read()
        return request.make_response(
            body,
            [
                ("Content-Type", "text/javascript"),
                ("Service-Worker-Allowed", "/pos/"),
                ("Cache-Control", "no-cache"),
            ],
        )
