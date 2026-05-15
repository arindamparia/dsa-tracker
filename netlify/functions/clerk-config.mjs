export const handler = async () => {
  const pk = process.env.CLERK_PUBLISHABLE_KEY ?? "";
  const allowAllUsers = process.env.ALLOW_ALL_USERS === "true";
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pk, allowAllUsers }),
  };
};
