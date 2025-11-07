
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model MappingProdukMasKemenkes
 * 
 */
export type MappingProdukMasKemenkes = $Result.DefaultSelection<Prisma.$MappingProdukMasKemenkesPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more MappingProdukMasKemenkes
 * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more MappingProdukMasKemenkes
   * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.mappingProdukMasKemenkes`: Exposes CRUD operations for the **MappingProdukMasKemenkes** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MappingProdukMasKemenkes
    * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findMany()
    * ```
    */
  get mappingProdukMasKemenkes(): Prisma.MappingProdukMasKemenkesDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.11.1
   * Query Engine version: f40f79ec31188888a2e33acda0ecc8fd10a853a9
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    MappingProdukMasKemenkes: 'MappingProdukMasKemenkes'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "mappingProdukMasKemenkes"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      MappingProdukMasKemenkes: {
        payload: Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>
        fields: Prisma.MappingProdukMasKemenkesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MappingProdukMasKemenkesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MappingProdukMasKemenkesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload>
          }
          findFirst: {
            args: Prisma.MappingProdukMasKemenkesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MappingProdukMasKemenkesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload>
          }
          findMany: {
            args: Prisma.MappingProdukMasKemenkesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload>[]
          }
          create: {
            args: Prisma.MappingProdukMasKemenkesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload>
          }
          createMany: {
            args: Prisma.MappingProdukMasKemenkesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.MappingProdukMasKemenkesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload>
          }
          update: {
            args: Prisma.MappingProdukMasKemenkesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload>
          }
          deleteMany: {
            args: Prisma.MappingProdukMasKemenkesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MappingProdukMasKemenkesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MappingProdukMasKemenkesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MappingProdukMasKemenkesPayload>
          }
          aggregate: {
            args: Prisma.MappingProdukMasKemenkesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMappingProdukMasKemenkes>
          }
          groupBy: {
            args: Prisma.MappingProdukMasKemenkesGroupByArgs<ExtArgs>
            result: $Utils.Optional<MappingProdukMasKemenkesGroupByOutputType>[]
          }
          count: {
            args: Prisma.MappingProdukMasKemenkesCountArgs<ExtArgs>
            result: $Utils.Optional<MappingProdukMasKemenkesCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    mappingProdukMasKemenkes?: MappingProdukMasKemenkesOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model MappingProdukMasKemenkes
   */

  export type AggregateMappingProdukMasKemenkes = {
    _count: MappingProdukMasKemenkesCountAggregateOutputType | null
    _min: MappingProdukMasKemenkesMinAggregateOutputType | null
    _max: MappingProdukMasKemenkesMaxAggregateOutputType | null
  }

  export type MappingProdukMasKemenkesMinAggregateOutputType = {
    id: string | null
    KodeMas: string | null
    NamaProduk: string | null
    KodeCabang: string | null
    NamaCabang: string | null
    IdProdukKemenkes: string | null
    CreatedAt: Date | null
    UpdatedAt: Date | null
  }

  export type MappingProdukMasKemenkesMaxAggregateOutputType = {
    id: string | null
    KodeMas: string | null
    NamaProduk: string | null
    KodeCabang: string | null
    NamaCabang: string | null
    IdProdukKemenkes: string | null
    CreatedAt: Date | null
    UpdatedAt: Date | null
  }

  export type MappingProdukMasKemenkesCountAggregateOutputType = {
    id: number
    KodeMas: number
    NamaProduk: number
    KodeCabang: number
    NamaCabang: number
    IdProdukKemenkes: number
    CreatedAt: number
    UpdatedAt: number
    _all: number
  }


  export type MappingProdukMasKemenkesMinAggregateInputType = {
    id?: true
    KodeMas?: true
    NamaProduk?: true
    KodeCabang?: true
    NamaCabang?: true
    IdProdukKemenkes?: true
    CreatedAt?: true
    UpdatedAt?: true
  }

  export type MappingProdukMasKemenkesMaxAggregateInputType = {
    id?: true
    KodeMas?: true
    NamaProduk?: true
    KodeCabang?: true
    NamaCabang?: true
    IdProdukKemenkes?: true
    CreatedAt?: true
    UpdatedAt?: true
  }

  export type MappingProdukMasKemenkesCountAggregateInputType = {
    id?: true
    KodeMas?: true
    NamaProduk?: true
    KodeCabang?: true
    NamaCabang?: true
    IdProdukKemenkes?: true
    CreatedAt?: true
    UpdatedAt?: true
    _all?: true
  }

  export type MappingProdukMasKemenkesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MappingProdukMasKemenkes to aggregate.
     */
    where?: MappingProdukMasKemenkesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MappingProdukMasKemenkes to fetch.
     */
    orderBy?: MappingProdukMasKemenkesOrderByWithRelationInput | MappingProdukMasKemenkesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MappingProdukMasKemenkesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MappingProdukMasKemenkes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MappingProdukMasKemenkes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MappingProdukMasKemenkes
    **/
    _count?: true | MappingProdukMasKemenkesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MappingProdukMasKemenkesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MappingProdukMasKemenkesMaxAggregateInputType
  }

  export type GetMappingProdukMasKemenkesAggregateType<T extends MappingProdukMasKemenkesAggregateArgs> = {
        [P in keyof T & keyof AggregateMappingProdukMasKemenkes]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMappingProdukMasKemenkes[P]>
      : GetScalarType<T[P], AggregateMappingProdukMasKemenkes[P]>
  }




  export type MappingProdukMasKemenkesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MappingProdukMasKemenkesWhereInput
    orderBy?: MappingProdukMasKemenkesOrderByWithAggregationInput | MappingProdukMasKemenkesOrderByWithAggregationInput[]
    by: MappingProdukMasKemenkesScalarFieldEnum[] | MappingProdukMasKemenkesScalarFieldEnum
    having?: MappingProdukMasKemenkesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MappingProdukMasKemenkesCountAggregateInputType | true
    _min?: MappingProdukMasKemenkesMinAggregateInputType
    _max?: MappingProdukMasKemenkesMaxAggregateInputType
  }

  export type MappingProdukMasKemenkesGroupByOutputType = {
    id: string
    KodeMas: string
    NamaProduk: string
    KodeCabang: string
    NamaCabang: string | null
    IdProdukKemenkes: string | null
    CreatedAt: Date
    UpdatedAt: Date | null
    _count: MappingProdukMasKemenkesCountAggregateOutputType | null
    _min: MappingProdukMasKemenkesMinAggregateOutputType | null
    _max: MappingProdukMasKemenkesMaxAggregateOutputType | null
  }

  type GetMappingProdukMasKemenkesGroupByPayload<T extends MappingProdukMasKemenkesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MappingProdukMasKemenkesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MappingProdukMasKemenkesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MappingProdukMasKemenkesGroupByOutputType[P]>
            : GetScalarType<T[P], MappingProdukMasKemenkesGroupByOutputType[P]>
        }
      >
    >


  export type MappingProdukMasKemenkesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    KodeMas?: boolean
    NamaProduk?: boolean
    KodeCabang?: boolean
    NamaCabang?: boolean
    IdProdukKemenkes?: boolean
    CreatedAt?: boolean
    UpdatedAt?: boolean
  }, ExtArgs["result"]["mappingProdukMasKemenkes"]>



  export type MappingProdukMasKemenkesSelectScalar = {
    id?: boolean
    KodeMas?: boolean
    NamaProduk?: boolean
    KodeCabang?: boolean
    NamaCabang?: boolean
    IdProdukKemenkes?: boolean
    CreatedAt?: boolean
    UpdatedAt?: boolean
  }

  export type MappingProdukMasKemenkesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "KodeMas" | "NamaProduk" | "KodeCabang" | "NamaCabang" | "IdProdukKemenkes" | "CreatedAt" | "UpdatedAt", ExtArgs["result"]["mappingProdukMasKemenkes"]>

  export type $MappingProdukMasKemenkesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MappingProdukMasKemenkes"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      KodeMas: string
      NamaProduk: string
      KodeCabang: string
      NamaCabang: string | null
      IdProdukKemenkes: string | null
      CreatedAt: Date
      UpdatedAt: Date | null
    }, ExtArgs["result"]["mappingProdukMasKemenkes"]>
    composites: {}
  }

  type MappingProdukMasKemenkesGetPayload<S extends boolean | null | undefined | MappingProdukMasKemenkesDefaultArgs> = $Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload, S>

  type MappingProdukMasKemenkesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<MappingProdukMasKemenkesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MappingProdukMasKemenkesCountAggregateInputType | true
    }

  export interface MappingProdukMasKemenkesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MappingProdukMasKemenkes'], meta: { name: 'MappingProdukMasKemenkes' } }
    /**
     * Find zero or one MappingProdukMasKemenkes that matches the filter.
     * @param {MappingProdukMasKemenkesFindUniqueArgs} args - Arguments to find a MappingProdukMasKemenkes
     * @example
     * // Get one MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MappingProdukMasKemenkesFindUniqueArgs>(args: SelectSubset<T, MappingProdukMasKemenkesFindUniqueArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one MappingProdukMasKemenkes that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MappingProdukMasKemenkesFindUniqueOrThrowArgs} args - Arguments to find a MappingProdukMasKemenkes
     * @example
     * // Get one MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MappingProdukMasKemenkesFindUniqueOrThrowArgs>(args: SelectSubset<T, MappingProdukMasKemenkesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MappingProdukMasKemenkes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MappingProdukMasKemenkesFindFirstArgs} args - Arguments to find a MappingProdukMasKemenkes
     * @example
     * // Get one MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MappingProdukMasKemenkesFindFirstArgs>(args?: SelectSubset<T, MappingProdukMasKemenkesFindFirstArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first MappingProdukMasKemenkes that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MappingProdukMasKemenkesFindFirstOrThrowArgs} args - Arguments to find a MappingProdukMasKemenkes
     * @example
     * // Get one MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MappingProdukMasKemenkesFindFirstOrThrowArgs>(args?: SelectSubset<T, MappingProdukMasKemenkesFindFirstOrThrowArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more MappingProdukMasKemenkes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MappingProdukMasKemenkesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findMany()
     * 
     * // Get first 10 MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const mappingProdukMasKemenkesWithIdOnly = await prisma.mappingProdukMasKemenkes.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MappingProdukMasKemenkesFindManyArgs>(args?: SelectSubset<T, MappingProdukMasKemenkesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a MappingProdukMasKemenkes.
     * @param {MappingProdukMasKemenkesCreateArgs} args - Arguments to create a MappingProdukMasKemenkes.
     * @example
     * // Create one MappingProdukMasKemenkes
     * const MappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.create({
     *   data: {
     *     // ... data to create a MappingProdukMasKemenkes
     *   }
     * })
     * 
     */
    create<T extends MappingProdukMasKemenkesCreateArgs>(args: SelectSubset<T, MappingProdukMasKemenkesCreateArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many MappingProdukMasKemenkes.
     * @param {MappingProdukMasKemenkesCreateManyArgs} args - Arguments to create many MappingProdukMasKemenkes.
     * @example
     * // Create many MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MappingProdukMasKemenkesCreateManyArgs>(args?: SelectSubset<T, MappingProdukMasKemenkesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a MappingProdukMasKemenkes.
     * @param {MappingProdukMasKemenkesDeleteArgs} args - Arguments to delete one MappingProdukMasKemenkes.
     * @example
     * // Delete one MappingProdukMasKemenkes
     * const MappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.delete({
     *   where: {
     *     // ... filter to delete one MappingProdukMasKemenkes
     *   }
     * })
     * 
     */
    delete<T extends MappingProdukMasKemenkesDeleteArgs>(args: SelectSubset<T, MappingProdukMasKemenkesDeleteArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one MappingProdukMasKemenkes.
     * @param {MappingProdukMasKemenkesUpdateArgs} args - Arguments to update one MappingProdukMasKemenkes.
     * @example
     * // Update one MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MappingProdukMasKemenkesUpdateArgs>(args: SelectSubset<T, MappingProdukMasKemenkesUpdateArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more MappingProdukMasKemenkes.
     * @param {MappingProdukMasKemenkesDeleteManyArgs} args - Arguments to filter MappingProdukMasKemenkes to delete.
     * @example
     * // Delete a few MappingProdukMasKemenkes
     * const { count } = await prisma.mappingProdukMasKemenkes.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MappingProdukMasKemenkesDeleteManyArgs>(args?: SelectSubset<T, MappingProdukMasKemenkesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MappingProdukMasKemenkes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MappingProdukMasKemenkesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MappingProdukMasKemenkesUpdateManyArgs>(args: SelectSubset<T, MappingProdukMasKemenkesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one MappingProdukMasKemenkes.
     * @param {MappingProdukMasKemenkesUpsertArgs} args - Arguments to update or create a MappingProdukMasKemenkes.
     * @example
     * // Update or create a MappingProdukMasKemenkes
     * const mappingProdukMasKemenkes = await prisma.mappingProdukMasKemenkes.upsert({
     *   create: {
     *     // ... data to create a MappingProdukMasKemenkes
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MappingProdukMasKemenkes we want to update
     *   }
     * })
     */
    upsert<T extends MappingProdukMasKemenkesUpsertArgs>(args: SelectSubset<T, MappingProdukMasKemenkesUpsertArgs<ExtArgs>>): Prisma__MappingProdukMasKemenkesClient<$Result.GetResult<Prisma.$MappingProdukMasKemenkesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of MappingProdukMasKemenkes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MappingProdukMasKemenkesCountArgs} args - Arguments to filter MappingProdukMasKemenkes to count.
     * @example
     * // Count the number of MappingProdukMasKemenkes
     * const count = await prisma.mappingProdukMasKemenkes.count({
     *   where: {
     *     // ... the filter for the MappingProdukMasKemenkes we want to count
     *   }
     * })
    **/
    count<T extends MappingProdukMasKemenkesCountArgs>(
      args?: Subset<T, MappingProdukMasKemenkesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MappingProdukMasKemenkesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MappingProdukMasKemenkes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MappingProdukMasKemenkesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MappingProdukMasKemenkesAggregateArgs>(args: Subset<T, MappingProdukMasKemenkesAggregateArgs>): Prisma.PrismaPromise<GetMappingProdukMasKemenkesAggregateType<T>>

    /**
     * Group by MappingProdukMasKemenkes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MappingProdukMasKemenkesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MappingProdukMasKemenkesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MappingProdukMasKemenkesGroupByArgs['orderBy'] }
        : { orderBy?: MappingProdukMasKemenkesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MappingProdukMasKemenkesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMappingProdukMasKemenkesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MappingProdukMasKemenkes model
   */
  readonly fields: MappingProdukMasKemenkesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MappingProdukMasKemenkes.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MappingProdukMasKemenkesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MappingProdukMasKemenkes model
   */
  interface MappingProdukMasKemenkesFieldRefs {
    readonly id: FieldRef<"MappingProdukMasKemenkes", 'String'>
    readonly KodeMas: FieldRef<"MappingProdukMasKemenkes", 'String'>
    readonly NamaProduk: FieldRef<"MappingProdukMasKemenkes", 'String'>
    readonly KodeCabang: FieldRef<"MappingProdukMasKemenkes", 'String'>
    readonly NamaCabang: FieldRef<"MappingProdukMasKemenkes", 'String'>
    readonly IdProdukKemenkes: FieldRef<"MappingProdukMasKemenkes", 'String'>
    readonly CreatedAt: FieldRef<"MappingProdukMasKemenkes", 'DateTime'>
    readonly UpdatedAt: FieldRef<"MappingProdukMasKemenkes", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MappingProdukMasKemenkes findUnique
   */
  export type MappingProdukMasKemenkesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * Filter, which MappingProdukMasKemenkes to fetch.
     */
    where: MappingProdukMasKemenkesWhereUniqueInput
  }

  /**
   * MappingProdukMasKemenkes findUniqueOrThrow
   */
  export type MappingProdukMasKemenkesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * Filter, which MappingProdukMasKemenkes to fetch.
     */
    where: MappingProdukMasKemenkesWhereUniqueInput
  }

  /**
   * MappingProdukMasKemenkes findFirst
   */
  export type MappingProdukMasKemenkesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * Filter, which MappingProdukMasKemenkes to fetch.
     */
    where?: MappingProdukMasKemenkesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MappingProdukMasKemenkes to fetch.
     */
    orderBy?: MappingProdukMasKemenkesOrderByWithRelationInput | MappingProdukMasKemenkesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MappingProdukMasKemenkes.
     */
    cursor?: MappingProdukMasKemenkesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MappingProdukMasKemenkes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MappingProdukMasKemenkes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MappingProdukMasKemenkes.
     */
    distinct?: MappingProdukMasKemenkesScalarFieldEnum | MappingProdukMasKemenkesScalarFieldEnum[]
  }

  /**
   * MappingProdukMasKemenkes findFirstOrThrow
   */
  export type MappingProdukMasKemenkesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * Filter, which MappingProdukMasKemenkes to fetch.
     */
    where?: MappingProdukMasKemenkesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MappingProdukMasKemenkes to fetch.
     */
    orderBy?: MappingProdukMasKemenkesOrderByWithRelationInput | MappingProdukMasKemenkesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MappingProdukMasKemenkes.
     */
    cursor?: MappingProdukMasKemenkesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MappingProdukMasKemenkes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MappingProdukMasKemenkes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MappingProdukMasKemenkes.
     */
    distinct?: MappingProdukMasKemenkesScalarFieldEnum | MappingProdukMasKemenkesScalarFieldEnum[]
  }

  /**
   * MappingProdukMasKemenkes findMany
   */
  export type MappingProdukMasKemenkesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * Filter, which MappingProdukMasKemenkes to fetch.
     */
    where?: MappingProdukMasKemenkesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MappingProdukMasKemenkes to fetch.
     */
    orderBy?: MappingProdukMasKemenkesOrderByWithRelationInput | MappingProdukMasKemenkesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MappingProdukMasKemenkes.
     */
    cursor?: MappingProdukMasKemenkesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MappingProdukMasKemenkes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MappingProdukMasKemenkes.
     */
    skip?: number
    distinct?: MappingProdukMasKemenkesScalarFieldEnum | MappingProdukMasKemenkesScalarFieldEnum[]
  }

  /**
   * MappingProdukMasKemenkes create
   */
  export type MappingProdukMasKemenkesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * The data needed to create a MappingProdukMasKemenkes.
     */
    data: XOR<MappingProdukMasKemenkesCreateInput, MappingProdukMasKemenkesUncheckedCreateInput>
  }

  /**
   * MappingProdukMasKemenkes createMany
   */
  export type MappingProdukMasKemenkesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MappingProdukMasKemenkes.
     */
    data: MappingProdukMasKemenkesCreateManyInput | MappingProdukMasKemenkesCreateManyInput[]
  }

  /**
   * MappingProdukMasKemenkes update
   */
  export type MappingProdukMasKemenkesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * The data needed to update a MappingProdukMasKemenkes.
     */
    data: XOR<MappingProdukMasKemenkesUpdateInput, MappingProdukMasKemenkesUncheckedUpdateInput>
    /**
     * Choose, which MappingProdukMasKemenkes to update.
     */
    where: MappingProdukMasKemenkesWhereUniqueInput
  }

  /**
   * MappingProdukMasKemenkes updateMany
   */
  export type MappingProdukMasKemenkesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MappingProdukMasKemenkes.
     */
    data: XOR<MappingProdukMasKemenkesUpdateManyMutationInput, MappingProdukMasKemenkesUncheckedUpdateManyInput>
    /**
     * Filter which MappingProdukMasKemenkes to update
     */
    where?: MappingProdukMasKemenkesWhereInput
    /**
     * Limit how many MappingProdukMasKemenkes to update.
     */
    limit?: number
  }

  /**
   * MappingProdukMasKemenkes upsert
   */
  export type MappingProdukMasKemenkesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * The filter to search for the MappingProdukMasKemenkes to update in case it exists.
     */
    where: MappingProdukMasKemenkesWhereUniqueInput
    /**
     * In case the MappingProdukMasKemenkes found by the `where` argument doesn't exist, create a new MappingProdukMasKemenkes with this data.
     */
    create: XOR<MappingProdukMasKemenkesCreateInput, MappingProdukMasKemenkesUncheckedCreateInput>
    /**
     * In case the MappingProdukMasKemenkes was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MappingProdukMasKemenkesUpdateInput, MappingProdukMasKemenkesUncheckedUpdateInput>
  }

  /**
   * MappingProdukMasKemenkes delete
   */
  export type MappingProdukMasKemenkesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
    /**
     * Filter which MappingProdukMasKemenkes to delete.
     */
    where: MappingProdukMasKemenkesWhereUniqueInput
  }

  /**
   * MappingProdukMasKemenkes deleteMany
   */
  export type MappingProdukMasKemenkesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MappingProdukMasKemenkes to delete
     */
    where?: MappingProdukMasKemenkesWhereInput
    /**
     * Limit how many MappingProdukMasKemenkes to delete.
     */
    limit?: number
  }

  /**
   * MappingProdukMasKemenkes without action
   */
  export type MappingProdukMasKemenkesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MappingProdukMasKemenkes
     */
    select?: MappingProdukMasKemenkesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the MappingProdukMasKemenkes
     */
    omit?: MappingProdukMasKemenkesOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable',
    Snapshot: 'Snapshot'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const MappingProdukMasKemenkesScalarFieldEnum: {
    id: 'id',
    KodeMas: 'KodeMas',
    NamaProduk: 'NamaProduk',
    KodeCabang: 'KodeCabang',
    NamaCabang: 'NamaCabang',
    IdProdukKemenkes: 'IdProdukKemenkes',
    CreatedAt: 'CreatedAt',
    UpdatedAt: 'UpdatedAt'
  };

  export type MappingProdukMasKemenkesScalarFieldEnum = (typeof MappingProdukMasKemenkesScalarFieldEnum)[keyof typeof MappingProdukMasKemenkesScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    
  /**
   * Deep Input Types
   */


  export type MappingProdukMasKemenkesWhereInput = {
    AND?: MappingProdukMasKemenkesWhereInput | MappingProdukMasKemenkesWhereInput[]
    OR?: MappingProdukMasKemenkesWhereInput[]
    NOT?: MappingProdukMasKemenkesWhereInput | MappingProdukMasKemenkesWhereInput[]
    id?: StringFilter<"MappingProdukMasKemenkes"> | string
    KodeMas?: StringFilter<"MappingProdukMasKemenkes"> | string
    NamaProduk?: StringFilter<"MappingProdukMasKemenkes"> | string
    KodeCabang?: StringFilter<"MappingProdukMasKemenkes"> | string
    NamaCabang?: StringNullableFilter<"MappingProdukMasKemenkes"> | string | null
    IdProdukKemenkes?: StringNullableFilter<"MappingProdukMasKemenkes"> | string | null
    CreatedAt?: DateTimeFilter<"MappingProdukMasKemenkes"> | Date | string
    UpdatedAt?: DateTimeNullableFilter<"MappingProdukMasKemenkes"> | Date | string | null
  }

  export type MappingProdukMasKemenkesOrderByWithRelationInput = {
    id?: SortOrder
    KodeMas?: SortOrder
    NamaProduk?: SortOrder
    KodeCabang?: SortOrder
    NamaCabang?: SortOrderInput | SortOrder
    IdProdukKemenkes?: SortOrderInput | SortOrder
    CreatedAt?: SortOrder
    UpdatedAt?: SortOrderInput | SortOrder
  }

  export type MappingProdukMasKemenkesWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MappingProdukMasKemenkesWhereInput | MappingProdukMasKemenkesWhereInput[]
    OR?: MappingProdukMasKemenkesWhereInput[]
    NOT?: MappingProdukMasKemenkesWhereInput | MappingProdukMasKemenkesWhereInput[]
    KodeMas?: StringFilter<"MappingProdukMasKemenkes"> | string
    NamaProduk?: StringFilter<"MappingProdukMasKemenkes"> | string
    KodeCabang?: StringFilter<"MappingProdukMasKemenkes"> | string
    NamaCabang?: StringNullableFilter<"MappingProdukMasKemenkes"> | string | null
    IdProdukKemenkes?: StringNullableFilter<"MappingProdukMasKemenkes"> | string | null
    CreatedAt?: DateTimeFilter<"MappingProdukMasKemenkes"> | Date | string
    UpdatedAt?: DateTimeNullableFilter<"MappingProdukMasKemenkes"> | Date | string | null
  }, "id">

  export type MappingProdukMasKemenkesOrderByWithAggregationInput = {
    id?: SortOrder
    KodeMas?: SortOrder
    NamaProduk?: SortOrder
    KodeCabang?: SortOrder
    NamaCabang?: SortOrderInput | SortOrder
    IdProdukKemenkes?: SortOrderInput | SortOrder
    CreatedAt?: SortOrder
    UpdatedAt?: SortOrderInput | SortOrder
    _count?: MappingProdukMasKemenkesCountOrderByAggregateInput
    _max?: MappingProdukMasKemenkesMaxOrderByAggregateInput
    _min?: MappingProdukMasKemenkesMinOrderByAggregateInput
  }

  export type MappingProdukMasKemenkesScalarWhereWithAggregatesInput = {
    AND?: MappingProdukMasKemenkesScalarWhereWithAggregatesInput | MappingProdukMasKemenkesScalarWhereWithAggregatesInput[]
    OR?: MappingProdukMasKemenkesScalarWhereWithAggregatesInput[]
    NOT?: MappingProdukMasKemenkesScalarWhereWithAggregatesInput | MappingProdukMasKemenkesScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MappingProdukMasKemenkes"> | string
    KodeMas?: StringWithAggregatesFilter<"MappingProdukMasKemenkes"> | string
    NamaProduk?: StringWithAggregatesFilter<"MappingProdukMasKemenkes"> | string
    KodeCabang?: StringWithAggregatesFilter<"MappingProdukMasKemenkes"> | string
    NamaCabang?: StringNullableWithAggregatesFilter<"MappingProdukMasKemenkes"> | string | null
    IdProdukKemenkes?: StringNullableWithAggregatesFilter<"MappingProdukMasKemenkes"> | string | null
    CreatedAt?: DateTimeWithAggregatesFilter<"MappingProdukMasKemenkes"> | Date | string
    UpdatedAt?: DateTimeNullableWithAggregatesFilter<"MappingProdukMasKemenkes"> | Date | string | null
  }

  export type MappingProdukMasKemenkesCreateInput = {
    id?: string
    KodeMas: string
    NamaProduk: string
    KodeCabang: string
    NamaCabang?: string | null
    IdProdukKemenkes?: string | null
    CreatedAt?: Date | string
    UpdatedAt?: Date | string | null
  }

  export type MappingProdukMasKemenkesUncheckedCreateInput = {
    id?: string
    KodeMas: string
    NamaProduk: string
    KodeCabang: string
    NamaCabang?: string | null
    IdProdukKemenkes?: string | null
    CreatedAt?: Date | string
    UpdatedAt?: Date | string | null
  }

  export type MappingProdukMasKemenkesUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    KodeMas?: StringFieldUpdateOperationsInput | string
    NamaProduk?: StringFieldUpdateOperationsInput | string
    KodeCabang?: StringFieldUpdateOperationsInput | string
    NamaCabang?: NullableStringFieldUpdateOperationsInput | string | null
    IdProdukKemenkes?: NullableStringFieldUpdateOperationsInput | string | null
    CreatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    UpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type MappingProdukMasKemenkesUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    KodeMas?: StringFieldUpdateOperationsInput | string
    NamaProduk?: StringFieldUpdateOperationsInput | string
    KodeCabang?: StringFieldUpdateOperationsInput | string
    NamaCabang?: NullableStringFieldUpdateOperationsInput | string | null
    IdProdukKemenkes?: NullableStringFieldUpdateOperationsInput | string | null
    CreatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    UpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type MappingProdukMasKemenkesCreateManyInput = {
    id?: string
    KodeMas: string
    NamaProduk: string
    KodeCabang: string
    NamaCabang?: string | null
    IdProdukKemenkes?: string | null
    CreatedAt?: Date | string
    UpdatedAt?: Date | string | null
  }

  export type MappingProdukMasKemenkesUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    KodeMas?: StringFieldUpdateOperationsInput | string
    NamaProduk?: StringFieldUpdateOperationsInput | string
    KodeCabang?: StringFieldUpdateOperationsInput | string
    NamaCabang?: NullableStringFieldUpdateOperationsInput | string | null
    IdProdukKemenkes?: NullableStringFieldUpdateOperationsInput | string | null
    CreatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    UpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type MappingProdukMasKemenkesUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    KodeMas?: StringFieldUpdateOperationsInput | string
    NamaProduk?: StringFieldUpdateOperationsInput | string
    KodeCabang?: StringFieldUpdateOperationsInput | string
    NamaCabang?: NullableStringFieldUpdateOperationsInput | string | null
    IdProdukKemenkes?: NullableStringFieldUpdateOperationsInput | string | null
    CreatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    UpdatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type MappingProdukMasKemenkesCountOrderByAggregateInput = {
    id?: SortOrder
    KodeMas?: SortOrder
    NamaProduk?: SortOrder
    KodeCabang?: SortOrder
    NamaCabang?: SortOrder
    IdProdukKemenkes?: SortOrder
    CreatedAt?: SortOrder
    UpdatedAt?: SortOrder
  }

  export type MappingProdukMasKemenkesMaxOrderByAggregateInput = {
    id?: SortOrder
    KodeMas?: SortOrder
    NamaProduk?: SortOrder
    KodeCabang?: SortOrder
    NamaCabang?: SortOrder
    IdProdukKemenkes?: SortOrder
    CreatedAt?: SortOrder
    UpdatedAt?: SortOrder
  }

  export type MappingProdukMasKemenkesMinOrderByAggregateInput = {
    id?: SortOrder
    KodeMas?: SortOrder
    NamaProduk?: SortOrder
    KodeCabang?: SortOrder
    NamaCabang?: SortOrder
    IdProdukKemenkes?: SortOrder
    CreatedAt?: SortOrder
    UpdatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}