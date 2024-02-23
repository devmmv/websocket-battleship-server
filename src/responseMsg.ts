export const responseMsg = (type: string, data: unknown) => {
  return JSON.stringify({
    type,
    data: JSON.stringify(data),
    id: 0,
  });
};
