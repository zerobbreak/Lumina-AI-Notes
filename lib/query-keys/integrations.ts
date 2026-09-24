export const integrationKeys = {
  all: ["integrations"] as const,
  brightspace: () => [...integrationKeys.all, "brightspace"] as const,
};
