import api from "./api";

const withAuth = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};

export const enableRecommendation = async (applicantId, enabled, token) => {
  const res = await api.patch(
    `/recommendations/enable/${applicantId}`,
    { enabled },
    withAuth(token)
  );
  return res.data;
};

export const generateRecommendation = async (applicantId, token) => {
  const res = await api.post(
    `/recommendations/generate/${applicantId}`,
    {},
    withAuth(token)
  );
  return res.data;
};

export const getRecommendations = async (applicantId, token) => {
  const res = await api.get(
    `/recommendations/${applicantId}`,
    withAuth(token)
  );
  return res.data;
};
