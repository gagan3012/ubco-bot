import json
import urllib3
import random
import pandas as pd


def clean(keywords):
    source_text = ' '.join(map(str, keywords))
    return source_text


def clubs_db():
    http = urllib3.PoolManager()
    request = http.request(
        'GET', 'https://ubcologo.s3.amazonaws.com/AllUBCOClubs.json')
    clubs = json.loads(request.data.decode('utf8'))
    clubs = pd.DataFrame.from_records(clubs)
    categories = clubs['categories'].map(lambda x: x if isinstance(x, list) else [
                                         x]).explode().unique().tolist()
    for i in range(len(clubs)):
      clubs['categories'][i] = clean(clubs['categories'][i])
    return clubs, categories


def categoryclubs(club, category, number):
  if number < len(club[club['categories'].str.contains(category)]['title'].tolist()):
    return club[club['categories'].str.contains(category)]['title'].tolist()[number]
  else:
    return 'No results found'

def handler(event, context):
    club, categories = clubs_db()
    category = event['req']['_event']['inputTranscript']
    event['res']['message'] = """
    Check out these clubs: 
    1. {}
    2. {}
    3. {}
    """.format(categoryclubs(club, category, 0),
               categoryclubs(club, category, 1),
               categoryclubs(club, category, 2))
    print(json.dumps(event, indent=4))
    return event
