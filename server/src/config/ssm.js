// Optional: load secrets from AWS Systems Manager Parameter Store (uses the EC2 IAM role; no keys in code).
// Parameters named <SSM_PREFIX>/DB_HOST, <SSM_PREFIX>/JWT_SECRET ... become process.env values.
export async function loadSsm() {
  const prefix = process.env.SSM_PREFIX;
  if (!prefix) return;
  const { SSMClient, GetParametersByPathCommand } = await import("@aws-sdk/client-ssm");
  const client = new SSMClient({});
  let NextToken;
  do {
    const out = await client.send(new GetParametersByPathCommand({ Path: prefix, WithDecryption: true, Recursive: true, NextToken }));
    for (const p of out.Parameters ?? []) process.env[p.Name.split("/").pop()] = p.Value;
    NextToken = out.NextToken;
  } while (NextToken);
  console.log("Loaded configuration from SSM Parameter Store");
}
