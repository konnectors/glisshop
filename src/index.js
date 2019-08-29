process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://9024a224f2e84dea8d380980ded155c0:f33a821889754980b4a976090c9eed18@sentry.cozycloud.cc/74'

const {
  BaseKonnector,
  requestFactory,
  scrape,
  saveBills,
  log
} = require('cozy-konnector-libs')
const request = requestFactory({
  cheerio: true,
  debug: true,
  jar: true
})
const moment = require('moment')

const baseUrl = 'https://www.glisshop.com'

module.exports = new BaseKonnector(start)

async function start(fields) {
  log('info', 'Authenticating ...')
  await authenticate(fields.login, fields.password)
  // log('info', 'Successfully logged in')
  // log('info', 'Fetching the list of documents')
  // const $ = await request(`${baseUrl}/mon_compte/mes_commandes/`)
  // log('info', 'Parsing list of documents')
  // const documents = await parseDocuments($)
  // log('info', `${documents.length} documents found `)
  // log('info', 'Saving data to Cozy')
  // await saveBills(documents, fields.folderPath, {
  //   identifiers: ['glisshop'],
  //   contentType: 'application/pdf'
  // })
}

async function authenticate(username, password) {
  await request.post(
    'https://www.glisshop.com/ajax.V1.php/fr_FR/Rbs/User/Login',
    {
      headers: {
        'X-HTTP-Method-Override': 'PUT'
      },
      json: true,
      body: {
        websiteId: 100187,
        sectionId: 100187,
        pageId: 100232,
        data: {
          login: username,
          password,
          realm: 'web',
          rememberMe: true,
          device: 'Firefox - Ubuntu'
        }
      }
    }
  )
}

function parseDocuments($) {
  const docs = scrape(
    $,
    {
      commandNumber: {
        sel: 'div[class=order-label] span',
        parse: string => string.split(' ')[1]
      },
      amount: {
        sel: '.order-amount',
        // Warning : Not a standard space
        parse: amount => parseFloat(amount.split(' ')[0])
      },
      currency: {
        sel: '.order-amount',
        // Warning : Not a standard space
        parse: amount => amount.split(' ')[1]
      },
      momentDate: {
        sel: 'div[class="order-label"]',
        parse: string =>
          moment(string.match(/\d{1,2}\/\d{1,2}\/\d{4}/)[0], 'DD-MM-YYYY')
      },
      fileurl: {
        sel: 'a[class="btn-enabled"]',
        attr: 'href'
      }
    },
    'div[class="panel panel-default"]'
  )
  return docs.map(doc => {
    const newDoc = {
      ...doc,
      filename:
        `${doc.momentDate.format('YYYY-MM-DD')}_${doc.amount}${doc.currency}_` +
        `${doc.commandNumber}.pdf`,
      date: doc.momentDate.toDate(),
      vendor: 'glisshop'
    }
    delete newDoc.momentDate
    return newDoc
  })
}
