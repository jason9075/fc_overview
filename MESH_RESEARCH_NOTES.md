# Matrix 1S 5IN1 II 未介紹 Mesh 調查

查核日期：2026-10-23。範圍是 `src/data/placement.ts` 中 15 個 `id: null` 的獨立配置，不含 22 個依照片估計的被動元件。僅採原廠照片、原廠標註、晶片製造商文件；程式裡的 `xtal_8m`、`tcxo`、`sot_*` 等名稱不視為鑑定依據。

## 結果與可信度

**只有 MM32F003 有 BETAFPV 直接型號標註。** 另外可從照片辨識三個 YXC 頻率元件的數字標示，以及兩個具有條紋與雙端子的疑似二極體；這些資訊不足以證明電氣連線或確切型號。查閱的官方產品、韌體支援頁及接線圖沒有提供完整原理圖、BOM 或內層 Layout。

「高」只表示表中明確列出的型號／印字證據較強，不代表已驗證本板上的全部功能。「推測」需要連線、完整料號或量測才能升級為已確認。

| Mesh key | 面 | 實際證據 | 能說明的用途／候選用途 | 確認程度與缺口 |
| --- | --- | --- | --- | --- |
| `mm32f003` | 正 | BETAFPV 正面標註圖直接寫 `MM32F003`；MindMotion 將此系列列為 Cortex-M0 MCU。[T][M] | 額外微控制器：執行其韌體並透過周邊介面進行控制；本板主要飛控 MCU 另為 STM32G473。 | **型號高；本板職責未知**。不得直接宣稱它負責 VTX 調頻、功率控制或 ESC。 |
| `ic_right` | 正 | 原廠照片有多引腳 IC，印字微弱，可能讀成 `PA5632` 類字串；原廠標註圖沒有為它命名。[F][U] | 未辨識 IC。靠近射頻區不等於已確認是 RF 功率放大器。 | **低**。沒有找到可靠製造商料號對應；暫不給功能名稱。 |
| `xtal_top` | 正 | 長條金屬外觀頻率元件，照片可讀到近似 `80R` 字樣，靠近 STM32。[F][U] | 候選為外部時脈用諧振元件。ST 文件僅確認 STM32G473 具外部諧振器能力，不能證明此顆的接線。[S] | **元件類別推測；用途推測**。`80R` 不能單獨證明 8 MHz，且未證明它連到 STM32 的振盪腳。 |
| `xtal_26m` | 正 | 照片清楚可讀 `YXC` 與 `26.000`，位於 ESP8285 鄰近區。[F][U] | 26 MHz 頻率參考元件；實際供時脈的對象未知。Espressif 文件列出的 24–52 MHz 範圍只說明能力，不是本板接線證據。[E][Y] | **印字高；連線用途推測**。完整料號、負載電容、精度與有源／無源類型不明。 |
| `tcxo` | 正 | 方形金屬封裝，原照印字近似 `BN52.0`、`D537`。[F][U] | 可能是 52 MHz 參考元件，位於 ELRS 射頻周邊。Semtech 對 SX1281 提供外部參考時脈文件。[R] | **候選用途推測**。`tcxo` 是程式命名，沒有找到能證明它具溫度補償的原廠對應料號，也未證明連到 SX1281。 |
| `sot_t1` | 正 | 小型黑色有腳封裝；照片無完整可辨識料號。[F][U] | 未辨識小型半導體；可能是電源／類比／開關元件，現有證據不能選定其中一種。 | **未知**。不能因為 `sot` 就說是電晶體、LDO 或 MOSFET。 |
| `sot_t2` | 正 | 小型黑色封裝與模糊印字，靠近接收機與供電周邊。[F][U] | 未辨識小型半導體。 | **未知**。需完整印字與連線，不能把鄰近元件的功能套用給它。 |
| `xtal_8m` | 背 | 原廠照片可讀 `YXC`、`8.000`，靠近原廠標示的 5.8G VTX 區域。[B][V] | 8 MHz 頻率參考元件；時脈的實際接收電路未知。[Y] | **印字高；本板連線推測**。尚未確認振盪器／晶體類型或受時脈晶片。 |
| `xtal_27m` | 背 | 原廠照片可讀 `YXC`、`27.000`，位於 AT7456E 鄰近區域。[B][V] | 27 MHz 頻率參考元件；不能只由位置指定給 OSD。[Y] | **印字高；本板用途未知**。未取得該板連線或能直接配對此元件的原廠 BOM。 |
| `inductor` | 背 | 原照有大型銀色方塊／金屬外觀元件，靠近另一多腳 IC；看不到可追溯料號。[B][V] | 候選為供電電路的功率電感，若是電感，其一般用途是儲能與電源轉換。[A] | **類別與本板用途推測**。不能確定感值、額定電流，或宣稱它就是 5V／3A BEC 的電感。 |
| `sot_b1` | 背 | 黑色小型有腳 IC，印字不足以唯一識別。[B][V] | 未辨識小型半導體。 | **未知**。不可定義成特定電壓穩壓器或驅動器。 |
| `sot_b2` | 背 | 照片實際是周邊多引腳的方形 IC，靠近銀色方塊元件；與名稱暗示的 SOT 類外觀不符。[B][V] | 未辨識多引腳 IC；不能只因靠近候選電感就認定為升壓控制器。 | **未知**。完整料號、封裝與接線未知；`sot_b2` 不應作為 SOT-23 的證據。 |
| `sot_b3` | 背 | 照片可見雙端子、條紋帶及近似 `E3` 印字，靠近 USB 區。[B][V] | 外觀高度符合二極體；可介紹一般二極體導通方向，但在本板上可能涉及整流、隔離或保護，無法選定。[D] | **二極體類別中等；本板用途未知**。不是可由照片支持的 SOT-23 電晶體；無法確認肖特基／TVS 類型或耐壓。 |
| `sot_b4` | 背 | 與 `sot_b3` 相似的雙端子、條紋帶及近似 `E3` 印字。[B][V] | 同為疑似二極體。 | **二極體類別中等；本板用途未知**。`E3` 不是可唯一識別全世界元件的料號；不能直接畫電源 OR-ing 或 USB 保護連線。 |
| `qfn_b5` | 背 | 極小黑色 IC，可見少量端點，無法讀出完整印字。[B][V] | 未辨識小型 IC。 | **未知**。`qfn` 只是程式名稱，尚不足以確認封裝、腳數或電氣功能。 |

## 能安全補充的介紹範圍

- **MM32F003 MCU**：可介紹製造商已證實的 MCU 類型與一般功能，明確保留本板具體職責未知。MindMotion 文件列出 Cortex-M0、最高 48 MHz、16 KB Flash、2 KB SRAM；這些是晶片能力，不是本板實際運行設定。[M]
- **三個 YXC 頻率元件**：可以展示照片可讀的 26.000、8.000、27.000，說明時脈參考的概念。不要由外殼判定有源振盪器／無源晶體，也不要把「鄰近某 IC」寫成已查明的連線。[Y]
- **兩個疑似二極體**：可標記照片辨識的類別；具體整流、保護、隔離用途仍缺證據。Vishay 的標記指南只是支持「條紋常標示二極體極性」的識別方法，不表示這兩顆是 Vishay 產品。[D]
- 其餘項目維持未知或明示推測。尤其應修正讓 `sot_b3`／`sot_b4` 看起來像一般多腳 IC 的模型分類，而不是替錯誤分類補一段故事。

## 來源與限制

[T]: https://cdn.shopify.com/s/files/1/1778/6615/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_top_front_gyro_update_600x600.jpg?v=1777532692 "BETAFPV 官方正面標註圖"
[F]: https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_soldered_front.jpg?v=1769154277 "BETAFPV 官方正面原照"
[U]: https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_unsoldered_front.jpg?v=1769154868 "BETAFPV 官方需焊接版正面原照"
[B]: https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_soldered_back.jpg?v=1769154294 "BETAFPV 官方背面原照"
[V]: https://betafpv.com/cdn/shop/files/Matrix_1S_5IN1_II_Brushless_Flight_Controller_unsoldered_back.jpg?v=1769154868 "BETAFPV 官方需焊接版背面原照"
[M]: https://www.mindmotion.com.cn/download/products/DS_MM32F003_q_EN.pdf "MindMotion MM32F003 原廠資料手冊"
[S]: https://www.st.com/resource/en/datasheet/stm32g473cb.pdf "ST STM32G473 原廠資料手冊"
[E]: https://www.espressif.com/sites/default/files/documentation/0a-esp8285_datasheet_en.pdf "Espressif ESP8285 原廠資料手冊，§3.2"
[R]: https://www.semtech.com/products/wireless-rf/lora-connect/sx1281 "Semtech SX1281 原廠產品與資料手冊入口"
[Y]: https://www.yxcxtal.com/service.html "YXC 原廠說明：外殼標記包含型號與額定頻率；產品包括有源與無源類型"
[D]: https://www.vishay.com/docs/88912/diodesgroupbodymarking.pdf "Vishay 原廠二極體標記指南"
[A]: https://www.analog.com/en/resources/analog-dialogue/articles/applying-dc-to-dc-step-up-boost-regulators.html "Analog Devices 原廠升壓轉換器技術說明"

BETAFPV [本型號產品頁](https://betafpv.com/products/matrix-1s-5in1-ii-brushless-flight-controller)確認板載主要系統，並連結上述原照與標註圖。它沒有逐顆說明本表的小型半導體。照片經放大或旋轉只能幫助觀察，不能恢復原圖不存在的細節；本次沒有使用生成式影像補字。

要進一步確認電路職責，需要原廠 BOM／原理圖、清晰微距印字，或斷電後的連通性量測。不可只靠常見參考電路將某 IC 或電感指定給本板的某條電源軌。
