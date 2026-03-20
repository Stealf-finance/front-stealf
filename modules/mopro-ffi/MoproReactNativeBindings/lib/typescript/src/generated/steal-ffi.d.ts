import { type UniffiRustCallStatus } from 'uniffi-bindgen-react-native';
interface NativeModuleInterface {
    ubrn_uniffi_internal_fn_func_ffi__string_to_byte_length(string: string, uniffi_out_err: UniffiRustCallStatus): number;
    ubrn_uniffi_internal_fn_func_ffi__string_to_arraybuffer(string: string, uniffi_out_err: UniffiRustCallStatus): Uint8Array;
    ubrn_uniffi_internal_fn_func_ffi__arraybuffer_to_string(buffer: Uint8Array, uniffi_out_err: UniffiRustCallStatus): string;
    ubrn_uniffi_steal_fn_func_mopro_hello_world(uniffi_out_err: UniffiRustCallStatus): Uint8Array;
    ubrn_uniffi_steal_fn_func_generate_circom_proof(zkeyPath: Uint8Array, circuitInputs: Uint8Array, proofLib: Uint8Array, uniffi_out_err: UniffiRustCallStatus): Uint8Array;
    ubrn_uniffi_steal_fn_func_verify_circom_proof(zkeyPath: Uint8Array, proofResult: Uint8Array, proofLib: Uint8Array, uniffi_out_err: UniffiRustCallStatus): number;
    ubrn_uniffi_steal_fn_func_generate_halo2_proof(srsPath: Uint8Array, pkPath: Uint8Array, circuitInputs: Uint8Array, uniffi_out_err: UniffiRustCallStatus): Uint8Array;
    ubrn_uniffi_steal_fn_func_verify_halo2_proof(srsPath: Uint8Array, vkPath: Uint8Array, proof: Uint8Array, publicInput: Uint8Array, uniffi_out_err: UniffiRustCallStatus): number;
    ubrn_uniffi_steal_fn_func_generate_noir_proof(circuitPath: Uint8Array, srsPath: Uint8Array, inputs: Uint8Array, onChain: number, vk: Uint8Array, lowMemoryMode: number, uniffi_out_err: UniffiRustCallStatus): Uint8Array;
    ubrn_uniffi_steal_fn_func_get_noir_verification_key(circuitPath: Uint8Array, srsPath: Uint8Array, onChain: number, lowMemoryMode: number, uniffi_out_err: UniffiRustCallStatus): Uint8Array;
    ubrn_uniffi_steal_fn_func_verify_noir_proof(circuitPath: Uint8Array, proof: Uint8Array, onChain: number, vk: Uint8Array, lowMemoryMode: number, uniffi_out_err: UniffiRustCallStatus): number;
    ubrn_uniffi_steal_checksum_func_mopro_hello_world(): number;
    ubrn_uniffi_steal_checksum_func_generate_circom_proof(): number;
    ubrn_uniffi_steal_checksum_func_verify_circom_proof(): number;
    ubrn_uniffi_steal_checksum_func_generate_halo2_proof(): number;
    ubrn_uniffi_steal_checksum_func_verify_halo2_proof(): number;
    ubrn_uniffi_steal_checksum_func_generate_noir_proof(): number;
    ubrn_uniffi_steal_checksum_func_get_noir_verification_key(): number;
    ubrn_uniffi_steal_checksum_func_verify_noir_proof(): number;
    ubrn_ffi_steal_uniffi_contract_version(): number;
}
declare const getter: () => NativeModuleInterface;
export default getter;
export type UniffiRustFutureContinuationCallback = (data: bigint, pollResult: number) => void;
export type UniffiForeignFutureDroppedCallback = (handle: bigint) => void;
export type UniffiForeignFutureDroppedCallbackStruct = {
    handle: bigint;
    free: UniffiForeignFutureDroppedCallback;
};
export type UniffiForeignFutureResultU8 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteU8 = (callbackData: bigint, result: UniffiForeignFutureResultU8) => void;
export type UniffiForeignFutureResultI8 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteI8 = (callbackData: bigint, result: UniffiForeignFutureResultI8) => void;
export type UniffiForeignFutureResultU16 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteU16 = (callbackData: bigint, result: UniffiForeignFutureResultU16) => void;
export type UniffiForeignFutureResultI16 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteI16 = (callbackData: bigint, result: UniffiForeignFutureResultI16) => void;
export type UniffiForeignFutureResultU32 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteU32 = (callbackData: bigint, result: UniffiForeignFutureResultU32) => void;
export type UniffiForeignFutureResultI32 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteI32 = (callbackData: bigint, result: UniffiForeignFutureResultI32) => void;
export type UniffiForeignFutureResultU64 = {
    returnValue: bigint;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteU64 = (callbackData: bigint, result: UniffiForeignFutureResultU64) => void;
export type UniffiForeignFutureResultI64 = {
    returnValue: bigint;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteI64 = (callbackData: bigint, result: UniffiForeignFutureResultI64) => void;
export type UniffiForeignFutureResultF32 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteF32 = (callbackData: bigint, result: UniffiForeignFutureResultF32) => void;
export type UniffiForeignFutureResultF64 = {
    returnValue: number;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteF64 = (callbackData: bigint, result: UniffiForeignFutureResultF64) => void;
export type UniffiForeignFutureResultRustBuffer = {
    returnValue: Uint8Array;
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteRustBuffer = (callbackData: bigint, result: UniffiForeignFutureResultRustBuffer) => void;
export type UniffiForeignFutureResultVoid = {
    callStatus: UniffiRustCallStatus;
};
export type UniffiForeignFutureCompleteVoid = (callbackData: bigint, result: UniffiForeignFutureResultVoid) => void;
//# sourceMappingURL=steal-ffi.d.ts.map