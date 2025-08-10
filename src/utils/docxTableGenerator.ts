import { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, BorderStyle } from 'docx';

export class DocxTableGenerator {
  
  /**
   * Создание таблицы результатов анализа
   */
  static createResultsTable(resultsTableData: any[]): Table {
    const rows = [];

    // Создание заголовка таблицы
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: '№ зоны измерения', 
                    bold: true,
                    size: 20 // 10pt
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Уровень измерения (м.)', 
                    bold: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Наименование логгера', 
                    bold: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Серийный № логгера', 
                    bold: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Мин. t°C', 
                    bold: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 14, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Макс. t°C', 
                    bold: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 14, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Среднее t°C', 
                    bold: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          })
        ],
        tableHeader: true
      })
    );

    // Создание строк данных
    resultsTableData.forEach((row, index) => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.zoneNumber || '-'),
                      size: 18
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.measurementLevel || '-'),
                      size: 18
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.loggerName || '-'),
                      size: 18
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.serialNumber || '-'),
                      size: 18
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.minTemp === 'number' ? `${row.minTemp}°C` : String(row.minTemp || '-'),
                      size: 18,
                      // Выделяем минимальное значение синим цветом
                      color: row.isMinTemp ? '1E40AF' : undefined
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : String(row.maxTemp || '-'),
                      size: 18,
                      // Выделяем максимальное значение красным цветом
                      color: row.isMaxTemp ? 'DC2626' : undefined
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : String(row.avgTemp || '-'),
                      size: 18
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100
              }
            })
          ]
        })
      );
    });

    // Создание и возврат таблицы
    return new Table({
      rows: rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        }
      }
    });
  }

  /**
   * Создание расширенной таблицы с влажностью
   */
  static createExtendedResultsTable(resultsTableData: any[]): Table {
    const rows = [];

    // Создание заголовка расширенной таблицы
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: '№ зоны', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 8, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Уровень (м.)', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Логгер', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'S/N', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Мин. t°C', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Макс. t°C', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Среднее t°C', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Мин. влажность %', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 14, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: 'Макс. влажность %', 
                    bold: true,
                    size: 18
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 14, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
          })
        ],
        tableHeader: true
      })
    );

    // Создание строк данных с влажностью
    resultsTableData.forEach((row, index) => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.zoneNumber || '-'),
                      size: 16
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.measurementLevel || '-'),
                      size: 16
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.loggerName || '-'),
                      size: 16
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.serialNumber || '-'),
                      size: 16
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.minTemp === 'number' ? `${row.minTemp}°C` : String(row.minTemp || '-'),
                      size: 16,
                      color: row.isMinTemp ? '1E40AF' : undefined
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : String(row.maxTemp || '-'),
                      size: 16,
                      color: row.isMaxTemp ? 'DC2626' : undefined
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : String(row.avgTemp || '-'),
                      size: 16
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.minHumidity === 'number' ? `${row.minHumidity}%` : String(row.minHumidity || '-'),
                      size: 16
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.maxHumidity === 'number' ? `${row.maxHumidity}%` : String(row.maxHumidity || '-'),
                      size: 16
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 }
            })
          ]
        })
      );
    });

    return new Table({
      rows: rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        }
      }
    });
  }
}