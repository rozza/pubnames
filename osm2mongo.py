#!/usr/bin/env python

"""
 A custom importer for importing osm files into mongodb, requires the imposm
 Library.

 After the import, it cleans / normalises the pub names

 Example Data Source for pubs:
 http://www.overpass-api.de/api/xapi?*[amenity=pub][bbox=-10.5,49.78,1.78,59]
"""

import re
import sys

from imposm.parser import OSMParser
import pymongo


class Handler(object):
    def nodes(self, nodes):
        if not nodes:
            return
        docs = []
        for node in nodes:
            osm_id, doc, (lon, lat) = node
            if "name" not in doc:
                node_points[osm_id] = (lon, lat)
                continue
            doc["name"] = doc["name"].title().lstrip("The ").replace("And", "&")
            doc["_id"] = osm_id
            doc["location"] = {"type": "Point", "coordinates": [lon, lat]}
            docs.append(doc)
        collection.insert(docs)

    def ways(self, ways):
        for osm_id, doc, refs in ways:
            if "name" not in doc:
                continue
            doc["_id"] = osm_id
            doc["name"] = doc["name"].title()
            doc["location"] = {"type": "Polygon", "coordinates": refs}
            all_ways.append(doc)

    def coords(self, coords):
        for osm_id, lon, lat in coords:
            node_points[osm_id] = (lon, lat)


def main(filename):

    # Import the data
    handler = Handler()
    OSMParser(nodes_callback=handler.nodes,
              ways_callback=handler.ways,
              coords_callback=handler.coords).parse(filename)

    print "Post processing ways"
    for doc in all_ways:
        refs = []
        for ref in doc["location"]["coordinates"]:
            refs.append(node_points[ref])
        if refs[0] == refs[-1]:
            refs = [refs]
        else:
            doc["location"]["type"] = "LineString"
        doc["location"]["coordinates"] = refs
        collection.insert(doc)

    # Add indexes
    collection.ensure_index([("location", "2dsphere")])

    print "Cleaning names"
    print collection.count()

    name_startswith = re.compile("^The .*")
    memo = set()
    for doc in collection.find({"name": name_startswith}):
        if doc["name"] in memo:
            continue
        memo.add(doc["name"])
        update_name = doc["name"].lstrip("The ")
        collection.update({"name": update_name},
                          {"$set": {"name": doc["name"]}}, multi=True)

all_ways = []
node_points = {}

collection = pymongo.MongoClient().demo.pubs
collection.drop()

if __name__ == '__main__':
    filename = sys.argv[1]
    main(filename)
