const getKolkataTime = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";

  return {
    year: getVal("year"),
    month: getVal("month"),
    day: getVal("day"),
    hour: getVal("hour"),
    minute: getVal("minute"),
    second: getVal("second"),
  };
};

export const getIndiaMarketDateRange = () => {
  const now = new Date();
  const kolkataNow = getKolkataTime(now);

  const hourNum = parseInt(kolkataNow.hour, 10);
  const minNum = parseInt(kolkataNow.minute, 10);

  let fromDateStr = `${kolkataNow.year}-${kolkataNow.month}-${kolkataNow.day} 09:15`;
  const toDateStr = `${kolkataNow.year}-${kolkataNow.month}-${kolkataNow.day} ${kolkataNow.hour}:${kolkataNow.minute}`;

  // If currently before 9:15 AM IST, use yesterday for fromDate
  const isBeforeOpen = hourNum < 9 || (hourNum === 9 && minNum < 15);
  if (isBeforeOpen) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const kolkataYesterday = getKolkataTime(yesterday);
    fromDateStr = `${kolkataYesterday.year}-${kolkataYesterday.month}-${kolkataYesterday.day} 09:15`;
  }

  return {
    fromDate: fromDateStr,
    toDate: toDateStr,
  };
};

export const getIndiaMarketFromDate = (): string => {
  const { fromDate } = getIndiaMarketDateRange();
  return fromDate;
};

export const getIndiaMarketToDate = (): string => {
  const { toDate } = getIndiaMarketDateRange();
  return toDate;
};

export const formatISTTime = (timeInSeconds: number): string => {
  const date = new Date(timeInSeconds * 1000);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const formatISTDateTime = (timeInSeconds: number): string => {
  const date = new Date(timeInSeconds * 1000);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const convertCandleTimeToChartTime = (rawTime: string): number => {
  let isoString = rawTime;
  if (!rawTime.includes("+") && !rawTime.includes("Z")) {
    const cleanTime = rawTime.replace(" ", "T");
    if (cleanTime.includes("T") && cleanTime.split("T")[1]?.length === 5) {
      isoString = `${cleanTime}:00+05:30`;
    } else if (cleanTime.includes("T")) {
      isoString = `${cleanTime}+05:30`;
    } else {
      isoString = `${cleanTime}T00:00:00+05:30`;
    }
  }
  return Math.floor(new Date(isoString).getTime() / 1000);
};
