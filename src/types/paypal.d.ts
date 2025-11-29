declare module '@paypal/checkout-server-sdk' {
    export namespace core {
        export class PayPalHttpClient {
            constructor(environment: PayPalEnvironment);
            execute(request: unknown): Promise<{
                result: {
                    id: string;
                    status: string;
                    links?: Array<{ rel: string; href: string }>;
                };
            }>;
        }

        export class SandboxEnvironment {
            constructor(clientId: string, clientSecret: string);
        }

        export class LiveEnvironment {
            constructor(clientId: string, clientSecret: string);
        }

        export type PayPalEnvironment = SandboxEnvironment | LiveEnvironment;
    }

    export namespace orders {
        export class OrdersCreateRequest {
            prefer(preference: string): void;
            requestBody(body: {
                intent: string;
                purchase_units: Array<{
                    amount: {
                        currency_code: string;
                        value: string;
                    };
                    custom_id?: string;
                }>;
                application_context?: {
                    brand_name?: string;
                    landing_page?: string;
                    user_action?: string;
                    return_url?: string;
                    cancel_url?: string;
                };
            }): void;
        }
    }
}
