import React from 'react';
import { Image } from 'react-native';

const FastImage = (props: any) => <Image {...props} source={props.source} />;
FastImage.priority = { low: 'low', normal: 'normal', high: 'high' };
FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch', center: 'center' };
FastImage.cacheControl = { immutable: 'immutable', web: 'web', cacheOnly: 'cacheOnly' };

export default FastImage;
