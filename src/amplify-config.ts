import { Amplify } from 'aws-amplify';

// Simple configuration for Gen 2
// This app only uses Amplify for hosting, not for backend services
Amplify.configure({
  version: '2'
});

export default Amplify;
