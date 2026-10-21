export function groupPartnerTransactions<
  T extends { partnerId: string; partnerName: string; totalValue: number },
>(items: T[]) {
  const grouped: Record<
    string,
    {
      partnerName: string;
      items: T[];
      total: number;
    }
  > = {};

  items.forEach((item) => {
    if (!grouped[item.partnerId]) {
      grouped[item.partnerId] = {
        partnerName: item.partnerName,
        items: [],
        total: 0,
      };
    }
    grouped[item.partnerId].items.push(item);
    grouped[item.partnerId].total += item.totalValue;
  });

  return Object.entries(grouped)
    .sort(([, a], [, b]) => a.partnerName.localeCompare(b.partnerName))
    .map(([partnerId, data]) => ({
      partnerId,
      ...data,
    }));
}
