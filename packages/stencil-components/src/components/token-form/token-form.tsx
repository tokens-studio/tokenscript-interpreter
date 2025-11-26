import { Component, Event, type EventEmitter, h, Prop, State, Watch } from "@stencil/core";
import {
  type Config,
  processTokens,
  type TokenData,
  TokenResolver,
} from "@tokens-studio/tokenscript-interpreter";

export interface TokenFormSubmitData {
  name: string;
  token: TokenData;
}

export interface TokenFormSubmitEvent {
  data: TokenFormSubmitData;
}

export interface TokenFormCancelEvent {
  reason?: string;
}

export type TokenSource = Map<string, TokenData> | TokenResolver;

@Component({
  tag: "token-form",
  styleUrl: "token-form.css",
  shadow: true,
})
export class TokenForm {
  @Prop() selectedToken?: string;
  @Prop() tokens?: TokenSource;
  @Prop() config?: Config;
  @Prop() submitHandler?: (data: TokenFormSubmitData) => void;
  @Prop() cancelHandler?: () => void;

  // Internal resolver instance
  private resolver?: TokenResolver;
  // Cache of all tokens (for lookup when we have a TokenResolver)
  private tokensMap?: Map<string, TokenData>;

  @State() formData: {
    name: string;
    value: string;
  } = {
    name: "",
    value: "",
  };
  @State() resolvedValue: string = "";
  @State() resolveError: Error | null = null;

  @Event() formSubmit: EventEmitter<TokenFormSubmitEvent>;
  @Event() formCancel: EventEmitter<TokenFormCancelEvent>;

  componentWillLoad() {
    this.initializeResolver();
    this.loadSelectedToken();
    this.computeResolvedValue();
  }

  @Watch("tokens")
  tokensChanged() {
    this.initializeResolver();
    this.loadSelectedToken();
    this.computeResolvedValue();
  }

  @Watch("selectedToken")
  selectedTokenChanged() {
    this.loadSelectedToken();
    this.computeResolvedValue();
  }

  private loadSelectedToken(): void {
    if (!this.selectedToken) {
      this.formData = {
        name: "",
        value: "",
      };
      return;
    }

    if (!this.tokensMap) {
      // If we have a selected token but no tokens map, clear the form
      this.formData = {
        name: "",
        value: "",
      };
      return;
    }

    const tokenData = this.tokensMap.get(this.selectedToken);
    if (tokenData) {
      this.formData = {
        name: this.selectedToken,
        value: String(tokenData.$value),
      };
    } else {
      // Token not found in map
      this.formData = {
        name: "",
        value: "",
      };
    }
  }

  private initializeResolver(): void {
    if (!this.tokens) {
      this.resolver = undefined;
      this.tokensMap = undefined;
      return;
    }

    if (this.tokens instanceof TokenResolver) {
      // Use the passed resolver directly
      this.resolver = this.tokens;
      // We don't have direct access to the tokens map from TokenResolver
      // Consumer should pass the original map separately if they need selectedToken functionality
      this.tokensMap = undefined;
    } else {
      // Create a TokenResolver from the Map
      const tokenResolver = new TokenResolver();
      tokenResolver.build(this.tokens, this.config);
      // After build(), the tokenResolver instance has internal state ready for updateToken
      this.resolver = tokenResolver;
      this.tokensMap = this.tokens;
    }
  }

  private formatResolvedValue(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (value instanceof Error) return value.message;

    // Call toString() on symbols to get their formatted representation
    if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
      return value.toString();
    }

    return String(value);
  }

  private getTokenType(): string {
    // Try to get type from existing token data
    if (this.tokensMap && this.formData.name) {
      const existingToken = this.tokensMap.get(this.formData.name);
      if (existingToken?.$type) {
        return existingToken.$type;
      }
    }
    // Default to string if no type found
    return "string";
  }

  private computeResolvedValue = () => {
    const previewName = this.formData.name.trim() || "";
    const tokenType = this.getTokenType();

    // If we have a resolver, use updateToken for efficient incremental updates
    if (this.resolver) {
      try {
        const result = this.resolver.updateToken(previewName, this.formData.value, tokenType);
        this.resolvedValue = this.formatResolvedValue(result.resolvedValue);
        this.resolveError = result.resolvedValue instanceof Error ? result.resolvedValue : null;
      } catch (error) {
        this.resolveError = error as Error;
        this.resolvedValue = "";
      }
      return;
    }

    // Fallback: no token source, just process the single token
    try {
      const singleToken = new Map<string, TokenData>();
      singleToken.set(previewName, {
        $value: this.formData.value,
        $type: tokenType,
      });
      const result = processTokens<Map<string, unknown>>(singleToken, {
        config: this.config,
      });
      const resolved = result.tokens.get(previewName);
      this.resolvedValue = this.formatResolvedValue(resolved);
      this.resolveError = null;
    } catch (error) {
      this.resolveError = error as Error;
      this.resolvedValue = "";
    }
  };

  handleSubmit = (e: Event) => {
    e.preventDefault();
    const tokenData: TokenData = {
      $value: this.formData.value,
      $type: this.getTokenType(),
    };
    const submitData: TokenFormSubmitData = {
      name: this.formData.name,
      token: tokenData,
    };
    this.formSubmit.emit({ data: submitData });
    if (this.submitHandler) {
      this.submitHandler(submitData);
    }
  };

  handleCancel = () => {
    this.formCancel.emit({});
    if (this.cancelHandler) {
      this.cancelHandler();
    }
  };

  handleInputChange = (field: "name" | "value", value: string) => {
    this.formData = {
      ...this.formData,
      [field]: value,
    };
    this.computeResolvedValue();
  };

  render() {
    return (
      <form
        class="token-form"
        part="form"
        onSubmit={this.handleSubmit}
      >
        <div
          class="token-form__field"
          part="field"
        >
          <label
            htmlFor="token-name"
            class="token-form__label"
            part="label"
          >
            Name
          </label>
          <input
            id="token-name"
            type="text"
            class="token-form__input"
            part="input"
            value={this.formData.name}
            onInput={(e) => this.handleInputChange("name", (e.target as HTMLInputElement).value)}
            required
          />
        </div>

        <div
          class="token-form__field"
          part="field"
        >
          <label
            htmlFor="token-value"
            class="token-form__label"
            part="label"
          >
            Value
          </label>
          <input
            id="token-value"
            type="text"
            class="token-form__input"
            part="input"
            value={this.formData.value}
            onInput={(e) => this.handleInputChange("value", (e.target as HTMLInputElement).value)}
            required
          />
          {this.formData.value && (
            <div
              class="token-form__resolved"
              part="resolved"
            >
              {this.resolveError ? (
                <span
                  class="token-form__resolved--error"
                  part="resolved-error"
                >
                  Error: {this.resolveError.message}
                </span>
              ) : (
                <span
                  class="token-form__resolved--success"
                  part="resolved-success"
                >
                  Resolved: {this.resolvedValue}
                </span>
              )}
            </div>
          )}
        </div>

        <div
          class="token-form__actions"
          part="actions"
        >
          <button
            type="button"
            class="token-form__button token-form__button--cancel"
            part="button button-cancel"
            onClick={this.handleCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="token-form__button token-form__button--submit"
            part="button button-submit"
            onSubmit={this.handleSubmit}
          >
            Submit
          </button>
        </div>
      </form>
    );
  }
}
