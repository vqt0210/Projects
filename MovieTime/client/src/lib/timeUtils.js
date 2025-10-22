export const toLocalTime = (utcString) => {
  return new Date(utcString).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};

export const isShowValid = (utcString) => {
  return new Date(utcString) > new Date(); // cả 2 UTC
};
