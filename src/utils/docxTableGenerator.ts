import { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, BorderStyle } from 'docx';

/**
 * Генератор таблицы результатов анализа для DOCX документов
 */
export class DocxTableGenerator {
  
  /**
   * Создание таблицы результатов анализа
   * @param resultsTableData - данные для таблицы
   * @returns Table объект для вставки в DOCX
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
                    text: 'Наименование логгера (6 символов)', 
                    bold: true,
                    size: 20
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 18, type: WidthType.PERCENTAGE },
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
            width: { size: 13, type: WidthType.PERCENTAGE },
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
            width: { size: 13, type: WidthType.PERCENTAGE },
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
            width: { size: 14, type: WidthType.PERCENTAGE },
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
            // № зоны измерения
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.zoneNumber || '-'),
                      size: 20
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
            // Уровень измерения
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.measurementLevel || '-'),
                      size: 20
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
            // Наименование логгера
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.loggerName || '-'),
                      size: 20
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
            // Серийный номер
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: String(row.serialNumber || '-'),
                      size: 20
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
            // Минимальная температура
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.minTemp === 'number' ? `${row.minTemp.toFixed(1)}°C` : '-',
                      size: 20
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
            // Максимальная температура
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.maxTemp === 'number' ? `${row.maxTemp.toFixed(1)}°C` : '-',
                      size: 20
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
            // Средняя температура
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: typeof row.avgTemp === 'number' ? `${row.avgTemp.toFixed(1)}°C` : '-',
                      size: 20,
                      color: DocxTableGenerator.getTemperatureColor(row.avgTemp, row.meetsLimits)
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
   * Определение цвета текста для температуры в зависимости от соответствия лимитам
   */
  private static getTemperatureColor(temperature: number, meetsLimits: string): string {
    if (typeof temperature !== 'number') return "000000"; // черный для пустых значений
    
    switch (meetsLimits) {
      case 'Да':
        return "008000"; // зеленый для соответствующих лимитам
      case 'Нет':
        return "FF0000"; // красный для не соответствующих лимитам
      default:
        return "000000"; // черный по умолчанию
    }
  }

  /**
   * Создание расширенной таблицы с влажностью (для двухканальных логгеров)
   */
  static createExtendedResultsTable(resultsTableData: any[]): Table {
    const rows = [];

    // Заголовок расширенной таблицы
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: '№ зоны', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 8, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Уровень (м.)', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Логгер', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 12, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'S/N', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Мин. t°C', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Макс. t°C', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Ср. t°C', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Мин. RH%', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Макс. RH%', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Ср. RH%', bold: true, size: 18 })],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 10, type: WidthType.PERCENTAGE }
          })
        ],
        tableHeader: true
      })
    );

    // Строки данных для расширенной таблицы
    resultsTableData.forEach(row => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(row.zoneNumber || '-'), size: 18 })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(row.measurementLevel || '-'), size: 18 })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(row.loggerName || '-'), size: 18 })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(row.serialNumber || '-'), size: 18 })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: typeof row.minTemp === 'number' ? `${row.minTemp.toFixed(1)}` : '-',
                    size: 18
                  })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: typeof row.maxTemp === 'number' ? `${row.maxTemp.toFixed(1)}` : '-',
                    size: 18
                  })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: typeof row.avgTemp === 'number' ? `${row.avgTemp.toFixed(1)}` : '-',
                    size: 18
                  })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: typeof row.minHumidity === 'number' ? `${row.minHumidity.toFixed(1)}` : '-',
                    size: 18
                  })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: typeof row.maxHumidity === 'number' ? `${row.maxHumidity.toFixed(1)}` : '-',
                    size: 18
                  })],
                  alignment: AlignmentType.CENTER
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ 
                    text: typeof row.avgHumidity === 'number' ? `${row.avgHumidity.toFixed(1)}` : '-',
                    size: 18
                  })],
                  alignment: AlignmentType.CENTER
                })
              ]
            })
          ]
        })
      );
    });

    return new Table({
      rows: rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" }
      }
    });
  }
}