# -*- coding: utf-8 -*-
{
    "name": "POS Offline Mode",
    "version": "19.0.1.0.0",
    "category": "Point of Sale",
    "summary": "Full offline functionality for Odoo POS: reload, refresh and keep selling without internet, powered by Service Worker caching",
    "description": """
POS Offline Mode
================

Enable full offline functionality for Odoo POS. Work without internet
connection - reload, refresh, and continue selling even when offline.
All data is cached automatically using modern Service Worker technology.

* Automatic caching: assets, images and API calls are cached as you use the POS
* Smart strategies: Cache First for static assets, Network First for API calls,
  Stale-While-Revalidate for images
* Zero configuration: works out of the box, just install

You must open the POS online at least once to cache the data.
    """,
    "author": "Steven Marp",
    "website": "https://apps.odoo.com/apps/modules/browse?author=Steven Marp",
    "license": "OPL-1",
    "depends": ["point_of_sale"],
    "assets": {
        "point_of_sale._assets_pos": [
            "sm_pos_offline/static/src/js/pos_offline.js",
        ],
    },
    "images": ["static/description/banner.gif"],
    "installable": True,
    "application": True,
    "auto_install": False,
    "price": 10.00,
    "currency": "USD",
}
