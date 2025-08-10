import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  // For now, we don't need auth or data since the app uses external Replicate API
  // Just need hosting which Amplify provides automatically for Next.js
});

// Add any custom policies or configurations here if needed in the future
// For example, if you want to add S3 storage for images:
// backend.addOutput({
//   storage: {
//     aws_region: backend.stack.region,
//     bucket_name: 'your-bucket-name'
//   }
// });