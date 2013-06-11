#!/usr/bin/env python
import datetime
import os
import sys

import flask
import pymongo

from flask import request

app = flask.Flask(__name__)

mongodb_uri = os.environ.get('MONGOLAB_URI', 'mongodb://localhost:27017')
db = pymongo.MongoClient(mongodb_uri).demo
db.pubs.ensure_index([("location", "2dsphere")])


@app.route("/")
def index():
    return flask.render_template("index.html")


@app.route("/pubs.json")
def pubs():
    """
    List all the pubs for the bounding box.
    """
    match = {}
    bbox = request.args.get('bbox', None)
    try:
        bbox = [float(b) for b in bbox.split(',')]
        sw = [bbox[0], bbox[1]]
        nw = [bbox[0], bbox[3]]
        ne = [bbox[2], bbox[3]]
        se = [bbox[2], bbox[1]]
    except:
        bbox = None

    if bbox:
        match = {"location":
                    {"$geoWithin":
                        {"$geometry":
                            {"type": "Polygon",
                             "coordinates": [[sw, nw, ne, se, sw]]}}}}

    pub_names = db.pubs.aggregate([
        {"$match": match},
        {"$group":
           {"_id": "$name",
            "value": {"$sum": 1}
           }
        },
        {"$sort": {"value": -1}},
        {"$limit": 100},
        {"$project": {
            "_id": 0,
            "text": "$_id",
            "size": "$value"}}
    ])["result"]
    return flask.jsonify(pubs=pub_names)


if __name__ == "__main__":
    debug = any([x == 'debug' for x in sys.argv])
    app.run(debug=debug, host='0.0.0.0')
