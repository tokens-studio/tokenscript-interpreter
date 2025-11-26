import { useEffect, useRef } from "react";
import "@tokenscript/stencil-components";

export interface TokenFormData {
  name: string;
  value: string;
}

export interface TokenFormSubmitEvent {
  data: TokenFormData;
}

export interface TokenFormCancelEvent {
  reason?: string;
}

interface TokenFormWrapperProps {
  initialData?: TokenFormData;
  onSubmit: (data: TokenFormData) => void;
  onCancel: () => void;
}

export function TokenFormWrapper({ initialData, onSubmit, onCancel }: TokenFormWrapperProps) {
  const formRef = useRef<HTMLElement & { initialData?: TokenFormData }>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleSubmit = (event: CustomEvent<TokenFormSubmitEvent>) => {
      onSubmit(event.detail.data);
    };

    const handleCancel = (_event: CustomEvent<TokenFormCancelEvent>) => {
      onCancel();
    };

    form.addEventListener("formSubmit", handleSubmit as EventListener);
    form.addEventListener("formCancel", handleCancel as EventListener);

    return () => {
      form.removeEventListener("formSubmit", handleSubmit as EventListener);
      form.removeEventListener("formCancel", handleCancel as EventListener);
    };
  }, [onSubmit, onCancel]);

  useEffect(() => {
    if (formRef.current && initialData) {
      formRef.current.initialData = initialData;
    }
  }, [initialData]);

  return <token-form ref={formRef} class="token-form-stencil" />;
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
