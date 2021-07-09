import json
import urllib3
import random


def events_db():
    http = urllib3.PoolManager()
    request = http.request('GET', 'https://events.ok.ubc.ca/wp-json/tribe/events/v1/events')

    #x = requests.get('https://events.ok.ubc.ca/wp-json/tribe/events/v1/events')
    x = json.loads(request.data.decode('utf8'))
    events = []
    for n in range(len(x['events'])):
      try:
        events.append(dict(description=x['events'][n]['description'],
                           end_date=x['events'][n]['end_date_details'],
                           start_date=x['events'][n]['start_date_details'],
                           title=x['events'][n]['title'],
                           url=x['events'][n]['url'],
                           image=x['events'][n]['image']['url'],
                           excerpt=x['events'][n]['excerpt']))
      except:
        events.append(dict(description=x['events'][n]['description'],
                           end_date=x['events'][n]['end_date_details'],
                           start_date=x['events'][n]['start_date_details'],
                           title=x['events'][n]['title'],
                           url=x['events'][n]['url'],
                           excerpt=x['events'][n]['excerpt']))

    return {'events': events}


def lambda_handler(event, context):
    data = events_db()
    r1 = random.randint(0, 9)
    #event['res']['type'] = "ImageResponseCard"
    event['res']['message'] = "We have found the perfect event: {} find more details here: {}".format(
        data['events'][r1]['title'], data['events'][r1]['url'])
    event['res']['card']['send'] = False
    event['res']['card']['title'] = data['events'][r1]['title']
    event['res']['card']['text'] = data['events'][r1]['excerpt']
    event['res']['card']['url'] = data['events'][r1]['image']
    #print(json.dumps(event,indent=4))
    return event
