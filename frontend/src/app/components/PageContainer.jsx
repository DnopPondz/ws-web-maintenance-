"use client";

import React from "react";

const mergeClassNames = (...classes) =>
  classes.filter((value) => typeof value === "string" && value.trim().length > 0).join(" ");

const PageContainer = ({
  title,
  description,
  meta,
  actions,
  children,
  maxWidth = "max-w-7xl",
  className = "",
  contentClassName = "",
}) => {
  const wrapperClassName = mergeClassNames(
    "relative isolate min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#f2f7ff] via-white to-[#e3edff]",
    className,
  );

  const innerClassName = mergeClassNames(
    "relative z-10 mx-auto px-4 py-10 sm:px-6 lg:px-8",
    maxWidth,
    contentClassName,
  );

  return (
    <div className={wrapperClassName}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#316fb7]/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-16 h-96 w-96 rounded-full bg-[#7aa5e8]/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-[#316fb7]/10 blur-3xl" />
      </div>

      <div className={innerClassName}>
        {(meta || title || description || actions) && (
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              {meta && (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#316fb7]">
                  {meta}
                </p>
              )}
              {title && (
                <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                  {title}
                </h1>
              )}
              {description && (
                <p className="max-w-3xl text-base text-slate-600">
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                {actions}
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default PageContainer;
