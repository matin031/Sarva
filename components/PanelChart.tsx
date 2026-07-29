"use client";

import {
  AnimationInterpolateFn,
  Bar,
  BarChart,
  BarRectangleItem,
  CartesianLayout,
  interpolate,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { label: "1", y: 45 },
  { label: "2", y: 70 },
  { label: "3", y: 30 },
  { label: "5", y: 90 },
  { label: "6", y: 60 },
  { label: "7", y: 80 },
];

const swipeLeftAnimateItems: AnimationInterpolateFn<
  BarRectangleItem,
  CartesianLayout
> = (items, t) => {
  if (!items) return [];

  return items.flatMap((item) => {
    if (!item) return [];

    if (item.status === "removed") {
      return [
        {
          ...item.prev,
          x: interpolate(item.prev.x, item.prev.x - item.prev.width * 2, t),
        },
      ];
    }

    if (item.status === "matched") {
      return [
        {
          ...item.next,
          x: interpolate(item.prev.x, item.next.x, t),
          y: interpolate(item.prev.y, item.next.y, t),
          width: interpolate(item.prev.width, item.next.width, t),
          height: interpolate(item.prev.height, item.next.height, t),
        },
      ];
    }

    return [
      {
        ...item.next,
        x: interpolate(item.next.x + item.next.width * 2, item.next.x, t),
      },
    ];
  });
};

export default function AnimatedBarChart() {
  return (
    <BarChart
      height={400}
      data={data}
      margin={{
        top: 20,
        right: 20,
        left: 20,
        bottom: 20,
      }}
      style={{
        width: "100%",
      }}
    >
      <XAxis dataKey="label" />

      <Bar
        dataKey="y"
        fill="#008687"
        radius={[8, 8, 0, 0]}
        isAnimationActive
        animationBegin={0}
        animationDuration={1200}
        animationEasing="ease-out"
      />
    </BarChart>
  );
}
