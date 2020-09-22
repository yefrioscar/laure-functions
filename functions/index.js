const P = require('bluebird')

const functions = require('firebase-functions')
const cheerio = require('cheerio')
const PDFDocument = require('pdfkit')
const SVGtoPDF = require('svg-to-pdfkit')
const fs = require('fs')
const admin = require('firebase-admin')

admin.initializeApp({
  credential: admin.credential.applicationDefault()
})

let bucket = admin.storage().bucket('gs://laure-shop.appspot.com')

P.promisifyAll(fs)

exports.generatePdf = functions.https.onRequest(async (request, response) => {
  try {
    let file = await createInvoice()
    response.send(file)
  } catch (error) {
    response.send(error)
  }
})

const createInvoice = () => {
  return new Promise(async (resolve, reject) => {
    // Get template svg as text
    const template = await fs.readFileAsync('./template.svg', 'utf8')

    // Load in cheerio to manage like html
    const $ = cheerio.load(template)

    // this generates the document from SVG Template
    var doc = new PDFDocument({
      size: [595, 842]
    })

    // convert the html with svg to pdf
    SVGtoPDF(doc, $('body').html(), 0, 0, {
      preserveAspectRatio: 'true'
    })

    functions.logger.info('SVG - PDF converted', { structuredData: true })

    // Create new ref file in storage
    let pdfRef = bucket.file('invoices/1000.pdf')

    // Piping the response and upload with storage reference
    doc
      .pipe(
        pdfRef.createWriteStream({
          public: true
        })
      )
      .on('finish', data => {
        functions.logger.info('Finish ok', { data, structuredData: true })
        resolve('ok')
      })
      .on('error', err => {
        functions.logger.info('Error', { err, structuredData: true })
        reject(new Error('Error' + err))
      })

    doc.end()
  })
}
