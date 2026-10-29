
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-south-1_dVTm286E4',
      userPoolClientId: '7htvvt93qmtomojv4ovj5va254',
      loginWith: {
        username: true,
      },
    },
  },
});
