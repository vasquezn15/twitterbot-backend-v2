import tweepy
import pandas as pd
import numpy as np
import sklearn
import pickle
def is_bot(user_id):
    consumer_key = 'SdrVFzqpp5Zsx360tJ7lOfYbm'
    consumer_secret = 'B0j6KY2H5bv029lpd1444PUO9C2bx1CNhF941egUu9cjqij8ew'
    access_key = '1351804411148906496-G1wgg7I5oVtsaQwhuBtuancjPHtfAP'
    access_secret = 'gvqTVXdhdLqYdPUFAR3YsAhSSiKYSYCrKd2uIMxebHXDU'

    auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
    auth.set_access_token(access_key, access_secret)
    api = tweepy.API(auth)
    user = api.get_user(user_id)
    user._json
    user_data = {
        #'user.id' : user._json["id"],
        'user.followers_count': user._json['followers_count'],
        'user.friends_count': user._json['friends_count'],
        'user.favourites_count': user._json['favourites_count'],
        'user.statuses': user._json['statuses_count'],
        'user.verified': user._json['verified'],
        'user.geo_enabled': user._json['geo_enabled'],
        'user.use_background_image': user._json['profile_use_background_image'],
        'user.has_extended_profile': user._json['has_extended_profile'],
        'user.default_profile': user._json['default_profile'],
        'user.default_profile_image': user._json['default_profile_image']
    }
    print(user_data)
    user_data = pd.json_normalize(user_data)
    load_model = pickle.load(open('kneigh.pkl', 'rb'))
    user_prediction = load_model.predict(user_data)
    return user_prediction
