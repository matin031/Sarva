"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-border last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn("group flex w-full items-center gap-4 rounded-lg py-5 text-right outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none", className)}
        {...props}
      >
        {children}
        <ChevronDown aria-hidden="true" className="ms-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down motion-reduce:animate-none"
      {...props}
    >
      <div className={cn("pb-5 text-right text-sm leading-loose text-muted-foreground", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
