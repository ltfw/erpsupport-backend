-- Log push stok per batch ke Stock API (services/stockPush.js)
-- Jalankan sekali di database ERPSupport
USE ERPSupport;
GO

CREATE TABLE dbo.StockPushLog (
  Id           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StockPushLog PRIMARY KEY,
  RequestId    VARCHAR(50)    NULL,
  TriggerBy    VARCHAR(100)   NOT NULL,            -- 'cron' atau 'manual:<username>'
  StockDate    DATE           NULL,
  Status       VARCHAR(10)    NOT NULL,            -- SUCCESS / FAILED / SKIPPED
  TotalItems   INT            NULL,
  Branches     NVARCHAR(MAX)  NULL,                -- JSON: [{ distributor_code, items }]
  HttpStatus   INT            NULL,
  Message      NVARCHAR(MAX)  NULL,                -- pesan error / alasan dilewati
  ResponseBody NVARCHAR(MAX)  NULL,                -- respon dari Stock API
  StartedAt    DATETIME2(0)   NOT NULL,
  FinishedAt   DATETIME2(0)   NOT NULL
);
GO

CREATE INDEX IX_StockPushLog_StartedAt ON dbo.StockPushLog (StartedAt DESC);
GO
