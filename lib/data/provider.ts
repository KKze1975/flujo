import type { IDataProvider } from "./index";
import { SheetsDataProvider } from "./sheets";

let _provider: IDataProvider | null = null;

export function getProvider(): IDataProvider {
  if (!_provider) {
    _provider = new SheetsDataProvider();
  }
  return _provider;
}
