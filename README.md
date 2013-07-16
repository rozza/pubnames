UK Most Popular Pub Names
=========================

Run locally
-----------

Expects mongodb >= 2.4 to be running locally.

1. Load the bson data:

   mongorestore -d demos -c pubs pubs.bson

2. Load the requirements

	pip install -r requirements.txt

3. Run the app!

	python pubs.py debug

4. Go to localhost:5000!

	Move the map the generate a new wordle

Online demo
-----------

http://pubnames.rosslawley.co.uk/
