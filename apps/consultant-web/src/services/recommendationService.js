import api from "./api";

const withAuth = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};

export const enableRecommendation = async (studentId, enabled, token) => {
  const res = await api.patch(
    `/recommendations/enable/${studentId}`,
    { enabled },
    withAuth(token)
  );
  return res.data;
};

export const generateRecommendation = async (studentId, token) => {
  const res = await api.post(
    `/recommendations/generate/${studentId}`,
    {},
    withAuth(token)
  );
  return res.data;
};

export const getRecommendations = async (studentId, token) => {
  const res = await api.get(
    `/recommendations/${studentId}`,
    withAuth(token)
  );
  return res.data;
};
