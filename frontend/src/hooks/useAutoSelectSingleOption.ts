import { useEffect } from 'react';

export const useAutoSelectSingleOption = (
  value: string | string[],
  optionValues: string[],
  onChange: (value: string | string[]) => void,
  enabled = true,
) => {
  useEffect(() => {
    const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (!enabled || hasValue || optionValues.length !== 1) return;

    onChange(Array.isArray(value) ? [optionValues[0]] : optionValues[0]);
  }, [enabled, onChange, optionValues, value]);
};
