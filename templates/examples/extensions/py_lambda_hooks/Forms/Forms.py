

def forms(text):
    if text == 'Late course addition':
        return 'https://science.cms.ok.ubc.ca/wp-content/uploads/sites/128/2020/06/Late-Course-Addition-Application-FoS.pdf'
    elif text == 'Late course withdrawal.':
        return 'https://science.cms.ok.ubc.ca/wp-content/uploads/sites/128/2020/06/Late-Withdrawal-Request-FoS.pdf'
    elif text == 'Enroll in a course that you don’t have the prerequisites/corequisites for.':
        return 'https://science.cms.ok.ubc.ca/wp-content/uploads/sites/128/2020/06/Prerequisite-Waiver-Form-FoS.pdf'
    elif text == 'Take courses at the UBC Vancouver campus':
        return 'https://ubc.ca1.qualtrics.com/jfe/form/SV_0NgTkZblNljjdAx'
    elif text == 'Out of time Final Examination Request':
        return 'https://fccs.cms.ok.ubc.ca/wp-content/uploads/sites/92/2018/10/2020-Request-for-Out-Of-Time-Exam.pdf'
    elif text == 'Letter of Permission.':
        return 'https://ubc.ca1.qualtrics.com/jfe/form/SV_5ou9kE7gDVuwatT'
    elif text == 'Change course to Audit(AUD).':
        return 'https://science.cms.ok.ubc.ca/wp-content/uploads/sites/128/2020/06/Application-for-Course-Change-to-Audit-FOS.pdf'
    elif text == 'Work alone in a Teaching/Research Lab.':
        return 'https://science.cms.ok.ubc.ca/wp-content/uploads/sites/128/2020/04/Work-Alone-Protocol-FoS.pdf'
    else:
        return 'Sorry No forms for this request found.'


def handler(event, context):
    # Get the object from the event
    try:
        text = event['req']['_event']['inputTranscript']
        event['res']['message'] = 'You can find the form for {} here:'.format(text) + forms(text)
        return event
    except:
        print(event)    
