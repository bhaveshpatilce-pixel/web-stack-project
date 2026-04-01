const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];

const validateEnv = () => {
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required env vars: ${missingVars.join(", ")}`);
  }
};

module.exports = validateEnv;
