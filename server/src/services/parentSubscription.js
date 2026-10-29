
import {
  SNSClient,
  SubscribeCommand,
  GetSubscriptionAttributesCommand,
  ListSubscriptionsByTopicCommand,
} from "@aws-sdk/client-sns";

const sns = new SNSClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

const topicArn = process.env.SNS_TRANSACTION_TOPIC_ARN;

// Create an SNS email subscription with a student-specific filter.
export async function subscribeParent(studentId, email) {
  if (!topicArn) {
    throw new Error("SNS_TRANSACTION_TOPIC_ARN is not configured");
  }

  const result = await sns.send(
    new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: "email",
      Endpoint: email,
      ReturnSubscriptionArn: true,
      Attributes: {
        FilterPolicy: JSON.stringify({
          studentId: [String(studentId)],
        }),
        FilterPolicyScope: "MessageAttributes",
      },
    })
  );

  return result.SubscriptionArn;
}

// Verify that a subscription is confirmed and correctly filtered.
export async function isParentSubscriptionConfirmed(
  subscriptionArn,
  studentId
) {
  if (
    !subscriptionArn ||
    subscriptionArn === "pending confirmation"
  ) {
    return false;
  }

  try {
    const result = await sns.send(
      new GetSubscriptionAttributesCommand({
        SubscriptionArn: subscriptionArn,
      })
    );

    const attributes = result.Attributes ?? {};

    if (
      attributes.PendingConfirmation !== "false" ||
      attributes.TopicArn !== topicArn ||
      attributes.Protocol !== "email" ||
      attributes.FilterPolicyScope !== "MessageAttributes"
    ) {
      return false;
    }

    const filter = JSON.parse(
      attributes.FilterPolicy || "{}"
    );

    return (
      Array.isArray(filter.studentId) &&
      filter.studentId.length === 1 &&
      filter.studentId[0] === String(studentId)
    );
  } catch (error) {
    console.error(
      "SNS subscription verification failed:",
      error.message
    );
    return false;
  }
}

// Find a confirmed subscription matching the parent's email
// and the student's SNS filter.
export async function findConfirmedParentSubscription(
  studentId,
  email
) {
  if (!topicArn) {
    throw new Error("SNS_TRANSACTION_TOPIC_ARN is not configured");
  }

  let nextToken;

  do {
    const result = await sns.send(
      new ListSubscriptionsByTopicCommand({
        TopicArn: topicArn,
        NextToken: nextToken,
      })
    );

    for (const subscription of result.Subscriptions ?? []) {
      if (
        subscription.Protocol !== "email" ||
        subscription.Endpoint?.toLowerCase() !==
          email.toLowerCase() ||
        !subscription.SubscriptionArn?.startsWith("arn:")
      ) {
        continue;
      }

      const confirmed =
        await isParentSubscriptionConfirmed(
          subscription.SubscriptionArn,
          studentId
        );

      if (confirmed) {
        return subscription.SubscriptionArn;
      }
    }

    nextToken = result.NextToken;
  } while (nextToken);

  return null;
}

export async function isEmailAlreadySubscribed(email) {
  if (!topicArn) {
    throw new Error("SNS_TRANSACTION_TOPIC_ARN is not configured");
  }

  const normalizedEmail = email.trim().toLowerCase();
  let nextToken;

  do {
    const result = await sns.send(
      new ListSubscriptionsByTopicCommand({
        TopicArn: topicArn,
        NextToken: nextToken,
      })
    );

    for (const subscription of result.Subscriptions ?? []) {
      if (
        subscription.Protocol === "email" &&
        subscription.Endpoint?.trim().toLowerCase() === normalizedEmail
      ) {
        return true;
      }
    }

    nextToken = result.NextToken;
  } while (nextToken);

  return false;
}
